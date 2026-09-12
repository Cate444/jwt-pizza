# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       |       Frontend component         | Backend endpoints | Database SQL |
| --------------------------------------------------- | ---------------------------------| ----------------- | ------------ |
| View home page                                      | <Home />                         |                   |              |
| Register new user<br/>(t@jwt.com, pw: test)         | <Register setUser={setUser} />   | POST /api/auth    |SELECT * FROM userRole WHERE userId=?  AND INSERT INTO userRole (userId, role, objectId) VALUES (?,?,0)|
| Login new user<br/>(t@jwt.com, pw: test)            | <Login setUser={setUser} />      | PUT /api/auth     |SELECT * FROM userRole WHERE userId=? AND INSERT INTO userRole (userId, role, objectId) VALUES (?,?,0)|
| Order pizza                                         | <Menu />                         | GET /api/order/menu,POST /api/order | SELECT * FROM menu INSERT INTO dinerOrder (dinerId,franchiseId, storeId, date) VALUES (?,?,?,now())INSERT INTO orderItem (orderId, menuId, description, price) VALUES (?,?,?,?)             |
| Verify pizza                                        |                                  | GET /api/order    | SELECT id, franchiseId, storeId, date FROM dinerOrder WHERE dinerId=? SELECT id, menuId, description, price FROM orderItem WHERE orderId=?|
| View profile page                                   | <DinerDashboard user={user} />   | GET /api/franchise/:userId| userRole WHERE role='franchisee' AND userId=?
SELECT id, name FROM franchise WHERE id in (...), SELECT u.id, u.name, u.email FROM userRole ... WHERE ur.objectId=? AND ur.role='franchisee', SELECT s.id, s.name, SUM(oi.price)... FROM store ... WHERE s.franchiseId=?             |
| View franchise<br/>(as diner)                       |<DinerDashboard user={user} />    |                   |              |
| Logout                                              | <Logout setUser={setUser} />     | DELETE /api/auth  | DELETE FROM auth WHERE token=?             |
| View About page                                     | <About />                        |                   |              |
| View History page                                   | <History />                      |                   |              |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) |<Login setUser={setUser} />       | PUT /api/auth     | SELECT * FROM userRole WHERE userId=? AND INSERT INTO userRole (userId, role, objectId) VALUES (?,?,0)             |
| View franchise<br/>(as franchisee)                  |<FranchiseDashboard user={user} />|                   |              |
| Create a store                                      | <CreateStore />                  |                   |              |
| Close a store                                       | <CloseStore />                   |                   |              |
| Login as admin<br/>(a@jwt.com, pw: admin)           |<AdminDashboard user={user} />    | PUT /api/auth     |SELECT * FROM userRole WHERE userId=? AND INSERT INTO userRole (userId, role, objectId) VALUES (?,?,0)              |
| View Admin page                                     |<AdminDashboard user={user} />    |                   |              |
| Create a franchise for t@jwt.com                    | <CreateFranchise />              |                   |              |
| Close the franchise for t@jwt.com                   | <CloseFranchise />               |                   |              |
                                                      | ALL OF THESE ARE                 | 
                                                      | FOUND in app.tsx.                | 
