# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                        | Frontend component                  | Backend endpoints                           | Database SQL |
| ---------------------------------------------------- | ---------------------------------- | ----------------------------------------- | ------------ |
| View home page                                       | `<Home />`                         | na                                        | na |
| Register new user<br/>(t@jwt.com, pw: test)          | `<Register setUser={setUser} />`   | `POST /api/auth`                          | `INSERT INTO user (name, email, password) VALUES (?,?,?)`<br/>`INSERT INTO userRole (userId, role, objectId) VALUES (?,?,0)` |
| Login new user<br/>(t@jwt.com, pw: test)             | `<Login setUser={setUser} />`      | `PUT /api/auth`                           | `SELECT * FROM user WHERE email=?`<br/>`SELECT * FROM userRole WHERE userId=?`<br/>`INSERT INTO auth (token, userId) VALUES (?,?) ON DUPLICATE KEY UPDATE token=token` |
| Order pizza                                          | `<Menu />`                         | `GET /api/order/menu`<br/>`POST /api/order` | `SELECT * FROM menu`<br/>`INSERT INTO dinerOrder (dinerId, franchiseId, storeId, date) VALUES (?,?,?,now())`<br/>`INSERT INTO orderItem (orderId, menuId, description, price) VALUES (?,?,?,?)` |
| Verify pizza                                         | `<Delivery />`                     | `POST {factory}/api/order/verify`         | na |
| View profile page                                    | `<DinerDashboard user={user} />`   | `GET /api/user/me`                        | na |
| View franchise<br/>(as diner)                        | `<DinerDashboard user={user} />`   | `GET /api/franchise/:userId`              | `SELECT objectId FROM userRole WHERE role='franchisee' AND userId=?`<br/>`SELECT id, name FROM franchise WHERE id in (...)`<br/>`SELECT u.id, u.name, u.email FROM userRole ... WHERE ur.objectId=? AND ur.role='franchisee'`<br/>`SELECT s.id, s.name, SUM(oi.price)... FROM store ... WHERE s.franchiseId=?` |
| Logout                                               | `<Logout setUser={setUser} />`     | `DELETE /api/auth`                        | `DELETE FROM auth WHERE token=?` |
| View About page                                      | `<About />`                        | na                                        | na |
| View History page                                    | `<History />`                      | na                                        | na |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee)  | `<Login setUser={setUser} />`      | `PUT /api/auth`                           | `SELECT * FROM user WHERE email=?`<br/>`SELECT * FROM userRole WHERE userId=?`<br/>`INSERT INTO auth (token, userId) VALUES (?,?) ON DUPLICATE KEY UPDATE token=token` |
| View franchise<br/>(as franchisee)                   | `<FranchiseDashboard user={user} />`| `GET /api/franchise/:userId`            | `SELECT objectId FROM userRole WHERE role='franchisee' AND userId=?`<br/>`SELECT id, name FROM franchise WHERE id in (...)`<br/>`SELECT u.id, u.name, u.email FROM userRole ... WHERE ur.objectId=? AND ur.role='franchisee'`<br/>`SELECT s.id, s.name, SUM(oi.price)... FROM store ... WHERE s.franchiseId=?` |
| Create a store                                       | `<CreateStore />`                  | `POST /api/franchise/:franchiseId/store`  | `INSERT INTO store (franchiseId, name) VALUES (?,?)` |
| Close a store                                        | `<CloseStore />`                   | `DELETE /api/franchise/:franchiseId/store/:storeId` | `DELETE FROM store WHERE franchiseId=? AND id=?` |
| Login as admin<br/>(a@jwt.com, pw: admin)            | `<AdminDashboard user={user} />`   | `PUT /api/auth`                           | `SELECT * FROM user WHERE email=?`<br/>`SELECT * FROM userRole WHERE userId=?`<br/>`INSERT INTO auth (token, userId) VALUES (?,?) ON DUPLICATE KEY UPDATE token=token` |
| View Admin page                                      | `<AdminDashboard user={user} />`   | `GET /api/franchise?page=0&limit=10&name=*` | `SELECT id, name FROM franchise WHERE name LIKE ? LIMIT ? OFFSET ?` |
| Create a franchise for t@jwt.com                     | `<CreateFranchise />`              | `POST /api/franchise`                     | `SELECT id, name FROM user WHERE email=?`<br/>`INSERT INTO franchise (name) VALUES (?)`<br/>`INSERT INTO userRole (userId, role, objectId) VALUES (?,'franchisee',?)` |
| Close the franchise for t@jwt.com                    | `<CloseFranchise />`               | `DELETE /api/franchise/:franchiseId`      | `DELETE FROM store WHERE franchiseId=?`<br/>`DELETE FROM userRole WHERE objectId=?`<br/>`DELETE FROM franchise WHERE id=?` |
