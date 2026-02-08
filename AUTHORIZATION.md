## Authorization Implementation Guide

You now have **role-based access control (RBAC)** implemented in your API!

---

## Authorization Overview

### User Roles

- **user** (default) - Regular user
- **admin** - Administrator with special privileges

### Authorization Flow

```
Request arrives
    ↓
authMiddleware (Authentication)
├─ Is token valid? NO → 401 Unauthorized
└─ Is token valid? YES → continue
    ↓
authorize() middleware (Authorization)
├─ Does user have required role? NO → 403 Forbidden
└─ Does user have required role? YES → continue
    ↓
Controller executes
```

---

## HTTP Status Codes

- **401 Unauthorized** - User is NOT authenticated (no/invalid token)
- **403 Forbidden** - User IS authenticated but NOT authorized (lacks permission)

---

## Authorization Scenarios

### 1. Regular Users (role: "user")

**Can do:**

- Sign up
- Login
- View own preferences
- Update own preferences
- Delete own account
- Access news endpoint
- View profiling stats (debug endpoint)

**Cannot do:**

- View other users' data
- Delete other users' accounts
- Change other users' roles
- View all users (admin endpoints)
- Change own role to admin

### 2. Admins (role: "admin")

**Can do:**

- All regular user actions PLUS:
- View all users
- Change any user's role
- Delete any user account
- View application statistics

**Cannot do:**

- Demote themselves from admin
- Delete their own account (self-protection)

---

## API Endpoints with Authorization

### Public Endpoints (No Auth)

```
POST /users/signup          - Register new account
POST /users/login           - Login and get token
```

### Protected Endpoints (Auth Required: Any Logged-in User)

```
GET  /users/preferences     - View your own preferences
PUT  /users/preferences     - Update your own preferences
DELETE /users/account       - Delete your own account
GET  /news                  - Get personalized news
GET  /debug/profile         - View profiling stats
POST /debug/profile/reset   - Reset profiling stats
```

### Admin-Only Endpoints (Auth + Admin Role Required)

```
GET    /admin/users                  - List all users
PUT    /admin/users/:email/role      - Change user's role
DELETE /admin/users/:email           - Delete any user
GET    /admin/stats                  - View app statistics
```

---

## Testing Authorization

### 1. Create Two Test Users

```bash
# User 1: Regular user
curl -X POST http://localhost:3000/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John User",
    "email": "john@example.com",
    "password": "password123",
    "preferences": ["tech", "sports"]
  }'

# User 2: Another regular user
curl -X POST http://localhost:3000/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "password": "password456",
    "preferences": ["movies"]
  }'
```

### 2. Login and Get Tokens

```bash
# Login as John
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -c john_cookies.txt \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Login as Jane
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -c jane_cookies.txt \
  -d '{
    "email": "jane@example.com",
    "password": "password456"
  }'
```

### 3. Test: User Cannot Access Admin Endpoints

```bash
# John tries to access admin endpoints (should fail with 403)
curl -X GET http://localhost:3000/admin/users \
  -b john_cookies.txt

# Response: 403 Forbidden
{
  "error": "Forbidden",
  "message": "You need one of these roles to access this: admin"
}
```

### 4. Manually Create Admin User via MongoDB

```bash
# Connect to MongoDB and run:
db.users.updateOne(
  { email: "john@example.com" },
  { $set: { role: "admin" } }
)
```

### 5. Test: Admin Can Access Admin Endpoints

```bash
# Now John (as admin) can access admin endpoints
curl -X GET http://localhost:3000/admin/users \
  -b john_cookies.txt

# Response: 200 OK
{
  "message": "Users retrieved successfully",
  "userCount": 2,
  "users": [
    { "id": "...", "email": "john@example.com", "role": "admin" },
    { "id": "...", "email": "jane@example.com", "role": "user" }
  ]
}
```

### 6. Test: Admin Can Change User Role

```bash
# Admin John promotes Jane to admin
curl -X PUT http://localhost:3000/admin/users/jane@example.com/role \
  -H "Content-Type: application/json" \
  -b john_cookies.txt \
  -d '{ "role": "admin" }'

# Response: 200 OK
{
  "message": "User role updated successfully",
  "user": {
    "id": "...",
    "email": "jane@example.com",
    "role": "admin"
  }
}
```

### 7. Test: User Cannot Delete Other User's Account

```bash
# Jane tries to delete John's account (should fail with 403)
# First, update the endpoint to require authorization for DELETE /users/:email

# This would need a new endpoint in adminController
# For now, regular users can only delete their own account

curl -X DELETE http://localhost:3000/users/account \
  -b jane_cookies.txt

# Response: 200 OK (deletes only JANE's account)
{
  "message": "Your account has been deleted successfully"
}
```

### 8. Test: Admin Can Delete Any User

```bash
# Admin John deletes Jane's account
curl -X DELETE http://localhost:3000/admin/users/jane@example.com \
  -b john_cookies.txt

# Response: 200 OK
{
  "message": "User deleted successfully",
  "deletedUser": {
    "email": "jane@example.com",
    "username": "Jane Smith"
  }
}
```

### 9. Test: Admin Cannot Demote Self

```bash
# Admin John tries to change own role to user (should fail)
curl -X PUT http://localhost:3000/admin/users/john@example.com/role \
  -H "Content-Type: application/json" \
  -b john_cookies.txt \
  -d '{ "role": "user" }'

# Response: 400 Bad Request
{
  "error": "Invalid operation",
  "message": "Admin cannot demote themselves"
}
```

### 10. Test: Admin Cannot Delete Self

```bash
# Admin John tries to delete own account (should fail)
curl -X DELETE http://localhost:3000/admin/users/john@example.com \
  -b john_cookies.txt

# Response: 400 Bad Request
{
  "error": "Invalid operation",
  "message": "Admin cannot delete their own account"
}
```

---

## Authorization in Code

### Using `authorize()` Middleware

```javascript
// Single role
router.delete(
  "/users/:email",
  authMiddleware,
  authorize("admin"),
  deleteUserAsAdmin,
);

// Multiple roles (user can be one of these)
router.get(
  "/stats",
  authMiddleware,
  authorize(["admin", "moderator"]),
  getStats,
);
```

### Checking Authorization in Controller

```javascript
// Controllers automatically have req.user with role
async function adminFunction(req, res) {
  // This runs ONLY if user passed authorization
  console.log(req.user.role); // "admin"

  // Perform admin operation
}
```

---

## Authentication vs Authorization Summary

| Aspect         | Authentication   | Authorization          |
| -------------- | ---------------- | ---------------------- |
| **Question**   | Who are you?     | What can you do?       |
| **When**       | Login            | Accessing endpoint     |
| **Your API**   | authMiddleware   | authorize() middleware |
| **Error Code** | 401              | 403                    |
| **Checked by** | JWT verification | Role checking          |

---

## Logs to Expect

When authorization fails, you'll see:

```
[2026-02-07T10:30:45.123Z] [WARN] Authorization denied - insufficient permissions | { email: "john@example.com", userRole: "user", requiredRoles: ["admin"], path: "/admin/users" }
```

When authorization succeeds:

```
[2026-02-07T10:31:00.456Z] [DEBUG] Authorization successful | { email: "john@example.com", role: "admin", requiredRoles: ["admin"] }
```

---

## Next Steps

1. **Test in Postman** - Import endpoints and test with different users
2. **Add More Roles** - Extend with moderator, premium user, etc.
3. **Implement Scopes** - Fine-grained permissions (e.g., "can_delete_users", "can_view_stats")
4. **Add Audit Logging** - Track who did what when
5. **Implement Refresh Tokens** - Rotate tokens securely

---

## File Structure

```
middleware/
├── authMiddleware.js          ← Authentication (already existed)
└── authorizationMiddleware.js ← NEW: Authorization

controllers/
├── userController.js          ← Updated with deleteAccount
└── adminController.js         ← NEW: Admin operations

routes/
├── userRoutes.js              ← Updated
└── adminRoutes.js             ← NEW: Admin endpoints

models/
└── User.js                    ← Updated with role field
```
