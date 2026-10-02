import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';
import { mockBackend, login, users } from './mockBackend';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Global' });

test('home page', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  expect(await page.title()).toBe('JWT Pizza');
  await expect(page.getByRole('heading', { name: "The web's best pizza" })).toBeVisible();
  await expect(page.getByText('Most amazing pizza experience of my life.')).toBeAttached();
});

test('static pages, not found, and breadcrumb', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  await page.getByRole('contentinfo').getByRole('link', { name: 'About' }).click();
  await expect(page.getByText('The secret sauce')).toBeVisible();

  await page.getByRole('contentinfo').getByRole('link', { name: 'History' }).click();
  await expect(page.getByText('Mama Rucci, my my')).toBeVisible();

  await page.goto('/this-page-does-not-exist');
  await expect(page.getByText('Oops')).toBeVisible();

  await page.getByRole('link', { name: 'home' }).click();
  await expect(page.getByRole('heading', { name: "The web's best pizza" })).toBeVisible();
});

test('login failure then success, then logout', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  await nav(page).getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill(users.diner.email);
  await page.getByPlaceholder('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('unknown user')).toBeVisible();

  await page.getByPlaceholder('Password').fill(users.diner.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Logout' })).toBeVisible();

  await nav(page).getByRole('link', { name: 'Logout' }).click();
  await expect(nav(page).getByRole('link', { name: 'Login' })).toBeVisible();
});

test('register, including switching between login and register', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  await nav(page).getByRole('link', { name: 'Register' }).click();
  await page.getByRole('main').getByText('Login').click();
  await expect(page.getByText('Welcome back')).toBeVisible();
  await page.getByRole('main').getByText('Register').click();
  await expect(page.getByText('Welcome to the party')).toBeVisible();

  // Email already in use
  await page.getByPlaceholder('Full name').fill('Kai Chen');
  await page.getByPlaceholder('Email address').fill(users.diner.email);
  await page.getByPlaceholder('Password').fill('pw');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('user already exists')).toBeVisible();

  await page.getByPlaceholder('Full name').fill('Pizza');
  await page.getByPlaceholder('Email address').fill('new@jwt.com');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('link', { name: 'P', exact: true })).toBeVisible();
});

test('purchase with login, verify, and order more', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.getByText('Awesome is a click away')).toBeVisible();
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: /Veggie/ }).click();
  await page.getByRole('link', { name: /Pepperoni/ }).click();
  await expect(page.getByText('Selected pizzas: 2')).toBeVisible();
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Not logged in, so payment redirects to login
  await page.getByPlaceholder('Email address').fill(users.diner.email);
  await page.getByPlaceholder('Password').fill(users.diner.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('Send me those 2 pizzas right now!')).toBeVisible();
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tfoot')).toContainText('2 pies');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByText('Here is your JWT Pizza!')).toBeVisible();
  await expect(page.getByText('eyJpYXQ.fake.jwt')).toBeVisible();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText('JWT Pizza - valid')).toBeVisible();
  // Wait for the modal's open transition to finish before closing it
  await expect(page.locator('#hs-jwt-modal')).toHaveClass(/opened/);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('#hs-jwt-modal')).toBeHidden();

  await page.getByRole('button', { name: 'Order more' }).click();
  await expect(page.getByText('Awesome is a click away')).toBeVisible();
});

test('payment cancel, payment failure, and invalid JWT', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.diner, orderFails: true, verifyFails: true });
  await page.goto('/menu');

  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: /Veggie/ }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByText('Send me that pizza right now!')).toBeVisible();

  // Cancel keeps the order when returning to the menu
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Selected pizzas: 1')).toBeVisible();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('Failed to fulfill order at factory')).toBeVisible();

  // Delivery page with no order state shows an invalid JWT
  await page.goto('/delivery');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText('JWT Pizza - invalid')).toBeVisible();
});

test('diner dashboard', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await login(page, users.franchisee);

  await page.getByRole('link', { name: 'F', exact: true }).click();
  await expect(page.getByText('Your pizza kitchen')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Franchisee on 2');
  await expect(page.getByRole('main')).toContainText('f@jwt.com');
  await expect(page.locator('tbody')).toContainText('0.004');
});

test('franchise dashboard when not a franchisee', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await nav(page).getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByText('So you want a piece of the pie?')).toBeVisible();
  await expect(page.getByText('800-555-5555')).toBeVisible();
});

test('franchisee creates and closes stores', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await nav(page).getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('main').getByRole('link', { name: 'login' }).click();
  await page.getByPlaceholder('Email address').fill(users.franchisee.email);
  await page.getByPlaceholder('Password').fill(users.franchisee.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('LotaPizza')).toBeVisible();
  await expect(page.getByRole('row', { name: /Lehi/ })).toBeVisible();

  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByPlaceholder('store name').fill('Provo');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('row', { name: /Provo/ })).toBeVisible();

  await page.getByRole('row', { name: /Lehi/ }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Sorry to see you go')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('row', { name: /Lehi/ }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('row', { name: /Springville/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Lehi/ })).toHaveCount(0);
});

test('admin dashboard requires admin', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.diner });
  await page.goto('/admin-dashboard');
  await expect(page.getByText('Oops')).toBeVisible();
});

test('admin paginates and filters franchises', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await login(page, users.admin);

  await nav(page).getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible();
  await expect(page.getByRole('main')).toContainText('LotaPizza');
  await expect(page.getByRole('main')).not.toContainText('PizzaPocket');

  await page.getByRole('button', { name: '»' }).click();
  await expect(page.getByRole('main')).toContainText('PizzaPocket');
  await page.getByRole('button', { name: '«' }).click();
  await expect(page.getByRole('main')).toContainText('LotaPizza');

  await page.getByPlaceholder('Filter franchises').fill('Corp');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('main')).toContainText('PizzaCorp');
  await expect(page.getByRole('main')).not.toContainText('LotaPizza');
});

test('admin creates and closes franchises and stores', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.admin });
  await page.goto('/admin-dashboard');

  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByPlaceholder('franchise name').fill('NewPizza');
  await page.getByPlaceholder('franchisee admin email').fill('f@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible();

  await page.getByRole('row', { name: /topSpot/ }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Are you sure you want to close the topSpot franchise?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('row', { name: /topSpot/ }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('main')).not.toContainText('topSpot');

  await page.getByRole('row', { name: /Spanish Fork/ }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Spanish Fork')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('main')).not.toContainText('Spanish Fork');
});

test('docs pages', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/docs');
  await expect(page.getByText('JWT Pizza API')).toBeVisible();
  await expect(page.getByText('[GET] /api/order/menu')).toBeVisible();

  await page.goto('/docs/factory');
  await expect(page.getByText('[POST] /api/order')).toBeVisible();
});
