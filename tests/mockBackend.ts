import { Page, Route } from '@playwright/test';

type Role = { role: string; objectId?: string };
type User = { id: string; name: string; email: string; password: string; roles: Role[] };
type Store = { id: string; name: string; totalRevenue?: number };
type Franchise = { id: string; name: string; admins?: { id?: string; name?: string; email: string }[]; stores: Store[] };

const menu = [
  { id: '1', title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
  { id: '2', title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
];

export const users = {
  diner: { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'diner', roles: [{ role: 'diner' }] } as User,
  franchisee: { id: '4', name: 'Frank', email: 'f@jwt.com', password: 'franchisee', roles: [{ role: 'diner' }, { role: 'franchisee', objectId: '2' }] } as User,
  admin: { id: '1', name: '常用名字', email: 'a@jwt.com', password: 'admin', roles: [{ role: 'admin' }] } as User,
};

export interface MockOptions {
  // Seeds localStorage with a token so the app starts out logged in as this user.
  loggedInAs?: User;
  orderFails?: boolean;
  verifyFails?: boolean;
}

export async function mockBackend(page: Page, options: MockOptions = {}) {
  const accounts: User[] = Object.values(users).map((u) => ({ ...u }));
  let franchises: Franchise[] = [
    { id: '2', name: 'LotaPizza', admins: [{ id: '4', name: 'Frank', email: 'f@jwt.com' }], stores: [{ id: '4', name: 'Lehi', totalRevenue: 0.05 }, { id: '5', name: 'Springville', totalRevenue: 0.1 }] },
    { id: '3', name: 'PizzaCorp', admins: [], stores: [{ id: '7', name: 'Spanish Fork', totalRevenue: 0 }] },
    { id: '4', name: 'topSpot', admins: [], stores: [] },
    { id: '5', name: 'PizzaPocket', admins: [], stores: [{ id: '8', name: 'Orem', totalRevenue: 0 }] },
  ];
  const orders: any[] = [{ id: '1', franchiseId: '2', storeId: '4', date: '2024-06-05T05:14:40.000Z', items: [{ id: 1, menuId: '1', description: 'Veggie', price: 0.0038 }] }];
  let nextId = 100;

  const tokenFor = (user: User) => `token-${user.id}`;
  const userFromRequest = (route: Route) => {
    const auth = route.request().headers()['authorization'];
    return accounts.find((u) => auth === `Bearer ${tokenFor(u)}`);
  };
  const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, roles: u.roles });
  const json = (route: Route, body: any, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  if (options.loggedInAs) {
    const token = tokenFor(options.loggedInAs);
    await page.addInitScript((t) => localStorage.setItem('token', t), token);
  }

  await page.route(
    (url) => url.pathname.startsWith('/api/') && url.port !== '5173',
    async (route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());
      const path = url.pathname;
      const body = request.postDataJSON?.() ?? null;
      let m: RegExpMatchArray | null;

      if (path === '/api/auth') {
        if (method === 'PUT') {
          const user = accounts.find((u) => u.email === body.email && u.password === body.password);
          if (!user) return json(route, { message: 'unknown user' }, 404);
          return json(route, { user: publicUser(user), token: tokenFor(user) });
        }
        if (method === 'POST') {
          if (accounts.some((u) => u.email === body.email)) return json(route, { message: 'user already exists' }, 409);
          const user: User = { id: String(nextId++), name: body.name, email: body.email, password: body.password, roles: [{ role: 'diner' }] };
          accounts.push(user);
          return json(route, { user: publicUser(user), token: tokenFor(user) });
        }
        if (method === 'DELETE') return json(route, { message: 'logout successful' });
      }

      if (path === '/api/user/me') {
        const user = userFromRequest(route);
        return user ? json(route, publicUser(user)) : json(route, { message: 'unauthorized' }, 401);
      }

      if (path === '/api/order/menu') return json(route, menu);

      if (path === '/api/order') {
        if (method === 'GET') return json(route, { id: '3', dinerId: '3', orders, page: 1 });
        if (method === 'POST') {
          if (options.orderFails) return json(route, { message: 'Failed to fulfill order at factory' }, 500);
          const order = { ...body, id: String(nextId++) };
          orders.push({ ...order, date: new Date().toISOString() });
          return json(route, { order, jwt: 'eyJpYXQ.fake.jwt' });
        }
      }

      if (path === '/api/order/verify') {
        if (options.verifyFails) return json(route, { message: 'invalid' }, 401);
        return json(route, { message: 'valid', payload: { vendor: { id: 'byu' }, order: { id: '1' } } });
      }

      if (path === '/api/docs') {
        return json(route, {
          endpoints: [
            { requiresAuth: false, method: 'GET', path: '/api/order/menu', description: 'Get the pizza menu', example: 'curl localhost:3000/api/order/menu', response: menu },
            { requiresAuth: true, method: 'POST', path: '/api/order', description: 'Create an order', example: 'curl -X POST localhost:3000/api/order', response: { jwt: '1111' } },
          ],
        });
      }

      if (path === '/api/franchise') {
        if (method === 'GET') {
          const page = Number(url.searchParams.get('page') ?? 0);
          const limit = Number(url.searchParams.get('limit') ?? 10);
          const name = (url.searchParams.get('name') ?? '*').replace(/\*/g, '').toLowerCase();
          const matching = franchises.filter((f) => f.name.toLowerCase().includes(name));
          return json(route, { franchises: matching.slice(page * limit, (page + 1) * limit), more: matching.length > (page + 1) * limit });
        }
        if (method === 'POST') {
          const franchise = { ...body, id: String(nextId++), stores: [] };
          franchises.push(franchise);
          return json(route, franchise);
        }
      }

      if ((m = path.match(/^\/api\/franchise\/(\w+)\/store\/(\w+)$/)) && method === 'DELETE') {
        const franchise = franchises.find((f) => f.id === m![1]);
        if (franchise) franchise.stores = franchise.stores.filter((s) => s.id !== m![2]);
        return json(route, { message: 'store deleted' });
      }

      if ((m = path.match(/^\/api\/franchise\/(\w+)\/store$/)) && method === 'POST') {
        const store = { id: String(nextId++), name: body.name, totalRevenue: 0 };
        franchises.find((f) => f.id === m![1])?.stores.push(store);
        return json(route, store);
      }

      if ((m = path.match(/^\/api\/franchise\/(\w+)$/))) {
        if (method === 'GET') {
          const user = accounts.find((u) => u.id === m![1]);
          return json(route, franchises.filter((f) => f.admins?.some((a) => a.email === user?.email)));
        }
        if (method === 'DELETE') {
          franchises = franchises.filter((f) => f.id !== m![1]);
          return json(route, { message: 'franchise deleted' });
        }
      }

      return json(route, { message: `unmocked ${method} ${path}` }, 404);
    }
  );
}

export async function login(page: Page, user: User) {
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();
}
