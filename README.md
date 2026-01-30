# Personalized News Aggregator API

A backend service that allows users to create accounts, authenticate, define their news interests, and fetch personalized news articles aggregated from multiple sources based on their preferences.

## 🎯 Project Overview

This API provides a complete news aggregation solution with authentication, user preference management, and intelligent caching. Users can sign up, log in, manage their news preferences, and receive curated news articles matching their interests.

---

## 📁 Project Structure

```
news-aggregator-api/
├── app.js                          # Express app setup & route mounting
├── package.json                    # Dependencies & scripts
├── .env                           # Environment variables
├── README.md                      # Documentation
│
├── config/
│   └── db.js                      # MongoDB connection configuration
│
├── models/
│   └── User.js                    # Mongoose User schema
│
├── controllers/
│   ├── userController.js          # User signup, login, preferences
│   └── newsController.js          # News fetching & caching logic
│
├── routes/
│   ├── userRoutes.js              # User endpoints
│   └── newsRoutes.js              # News endpoint
│
├── middleware/
│   ├── authMiddleware.js          # JWT authentication
│   └── requestLogger.js           # Request/response logging
│
├── utils/
│   ├── logger.js                  # Centralized logging utility
│   └── errorHandler.js            # Error handling helper functions
│
└── test/
    └── server.test.js             # Test cases
```

---

## 🔐 Security Features Implemented

### 1. **Password Hashing (bcryptjs)**

Passwords are securely hashed using bcryptjs with 10 salt rounds before storing in the database.

```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

**Why?**

- One-way encryption: passwords cannot be decrypted
- Even if database is compromised, passwords are protected
- Salt prevents rainbow table attacks
- 10 rounds provides strong security without excessive slowdown

### 2. **JWT Authentication (JSON Web Tokens)**

Users receive JWT tokens on login that must be included in request headers to access protected endpoints.

```javascript
const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "1h" });
```

**Token Structure:**

- **Header:** Algorithm & token type (HS256)
- **Payload:** User email claim
- **Signature:** Created with JWT_SECRET

**Implementation:**

- Tokens expire after 1 hour
- Bearer token format: `Authorization: Bearer <token>`
- All protected routes verify token via `authMiddleware`

**Where Used:**

- ✅ POST /users/login - Issues token
- ✅ GET /users/preferences - Requires token
- ✅ PUT /users/preferences - Requires token
- ✅ GET /news - Requires token

---

## ⚡ Performance Optimization: Caching

### **In-Memory Cache Implementation**

The `/news` endpoint uses intelligent caching to reduce external API calls and improve response times.

**Cache Configuration:**

```javascript
const newsCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
```

**How It Works:**

1. **Cache Key Generation:**
   - Format: `news:{userId}:{sortedPreferences}`
   - Example: `news:507f1f77bcf86cd799439011:movies|sports|tech`

2. **Cache Hit/Miss Logic:**

   ```javascript
   const cached = newsCache.get(cacheKey);
   if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
     // Return cached data (instant response)
   }
   // Call external API (slower)
   ```

3. **Time-To-Live (TTL):**
   - 10 minutes per user preference combination
   - After 10 minutes, data is considered stale and refreshed

**Performance Benefits:**

| Scenario                  | Without Cache     | With Cache            |
| ------------------------- | ----------------- | --------------------- |
| First request             | 1500ms (API call) | 1500ms (API call)     |
| 2nd request (2 min later) | 1500ms (API call) | 5ms (cached)          |
| 3rd request (5 min later) | 1500ms (API call) | 5ms (cached)          |
| Request after 10 min      | 1500ms (API call) | 1500ms (new API call) |

**API Rate Limiting Saved:**

- Without cache: 100 requests = 100 API calls
- With cache: 100 requests = ~10 API calls (90% reduction)
- Free tier NewsAPI limit: 500 requests/day

---

## 📡 API Endpoints

### **Authentication Endpoints**

#### **1. POST /users/signup**

Create a new user account

**Request:**

```bash
POST http://localhost:8089/users/signup
Content-Type: application/json

{
  "name": "Clark Kent",
  "email": "clark@superman.com",
  "password": "Krypt()n8",
  "preferences": ["movies", "comics"]
}
```

**Success Response (201):**

```json
{
  "message": "User created successfully"
}
```

**Error Responses:**

- `400` - Missing required fields or duplicate email
- `500` - Server error

**Implementation:** [userController.js](controllers/userController.js#L8)

---

#### **2. POST /users/login**

Authenticate user and receive JWT token

**Request:**

```bash
POST http://localhost:8089/users/login
Content-Type: application/json

{
  "email": "clark@superman.com",
  "password": "Krypt()n8"
}
```

**Success Response (200):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Server error

**Implementation:** [userController.js](controllers/userController.js#L47)

---

### **User Preferences Endpoints (Protected)**

#### **3. GET /users/preferences**

Retrieve logged-in user's saved news preferences

**Request:**

```bash
GET http://localhost:8089/users/preferences
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**

```json
{
  "message": "Preferences retrieved successfully",
  "preferences": ["movies", "comics"]
}
```

**Error Responses:**

- `401` - Missing or invalid token
- `404` - User not found
- `500` - Server error

**Implementation:** [userController.js](controllers/userController.js#L81)

---

#### **4. PUT /users/preferences**

Update user's news preferences

**Request:**

```bash
PUT http://localhost:8089/users/preferences
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "preferences": ["movies", "comics", "games"]
}
```

**Success Response (200):**

```json
{
  "message": "Preferences updated successfully",
  "preferences": ["movies", "comics", "games"]
}
```

**Error Responses:**

- `400` - preferences not an array or invalid format
- `401` - Missing or invalid token
- `404` - User not found
- `500` - Server error

**Implementation:** [userController.js](controllers/userController.js#L103)

---

### **News Aggregation Endpoint (Protected)**

#### **5. GET /news**

Fetch personalized news articles based on user preferences

**Request:**

```bash
GET http://localhost:8089/news
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**

```json
{
  "message": "News fetched successfully",
  "news": [
    {
      "source": { "id": "techcrunch", "name": "TechCrunch" },
      "author": "Jane Doe",
      "title": "Breaking: New AI Technology Released",
      "description": "...",
      "url": "https://techcrunch.com/...",
      "urlToImage": "https://...",
      "publishedAt": "2026-01-30T12:00:00Z",
      "content": "..."
    }
    // ... more articles
  ]
}
```

**Features:**

- ✅ Personalized by user preferences
- ✅ Cached for 10 minutes per user
- ✅ Sorted by publish date (latest first)
- ✅ Default query: "news" if no preferences set
- ✅ Multiple preferences combined with OR logic

**Error Responses:**

- `401` - Missing or invalid token
- `404` - User not found
- `200` - Empty array if external API fails

**Implementation:** [newsController.js](controllers/newsController.js#L16)

---

## 🔧 Technical Architecture

### **Middleware Stack**

1. **Body Parser Middleware**
   - Parses JSON requests
   - Handles URL-encoded data

2. **Request Logger Middleware**
   - Logs all HTTP requests and responses
   - Tracks duration, status code, response size
   - Helps with debugging and monitoring

3. **Auth Middleware (Protected Routes)**
   - Validates Bearer token
   - Extracts user email from JWT payload
   - Prevents unauthorized access

### **Data Flow**

```
Client Request
    ↓
Express App
    ↓
Request Logger (logs request)
    ↓
Routes
    ↓
Auth Middleware (if protected route)
    ↓
Controllers
    ↓
Database/External API
    ↓
Error Handler (if error)
    ↓
Logger (logs error)
    ↓
Response Sent
    ↓
Request Logger (logs response)
```

---

## 📊 Logging System

The project implements a comprehensive logging system with 4 levels:

| Level     | When Used                               | Visibility       |
| --------- | --------------------------------------- | ---------------- |
| **ERROR** | Server errors (500s)                    | Always logged    |
| **WARN**  | Client errors (4xx), auth failures      | Always logged    |
| **INFO**  | Successful operations, important events | Always logged    |
| **DEBUG** | Development details (cache hits/misses) | Development only |

**Example Logs:**

```
[2026-01-30T12:34:56.789Z] [INFO] POST /users/signup | { email: "clark@superman.com", userId: "507f1f77bcf86cd799439011" }

[2026-01-30T12:35:10.123Z] [INFO] POST /users/login | { email: "clark@superman.com" }

[2026-01-30T12:35:25.456Z] [DEBUG] Cache HIT | { cacheKey: "news:507f1f77bcf86cd799439011:movies|sports", articleCount: 45 }

[2026-01-30T12:36:00.789Z] [WARN] Authorization attempt failed | { path: "/news", reason: "Missing or malformed header" }
```

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js >= 18.0.0
- MongoDB account (Atlas or local)
- NewsAPI key from [newsapi.org](https://newsapi.org)

### **Installation**

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd news-aggregator-api
   ```

2. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

3. Create `.env` file:

   ```env
   PORT=8089
   DB_CONNECTION=mongodb+srv://username:password@cluster.mongodb.net/?appName=MyCluster
   DB_NAME=test
   JWT_SECRET=your-secret-key
   NEWS_API_KEY=your-newsapi-key
   NODE_ENV=development
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Run tests:
   ```bash
   npm run test
   ```

---

## 🔑 Key Technologies

| Technology       | Purpose                             |
| ---------------- | ----------------------------------- |
| **Express.js**   | REST API framework                  |
| **MongoDB**      | NoSQL database                      |
| **Mongoose**     | ODM for MongoDB                     |
| **bcryptjs**     | Password hashing                    |
| **jsonwebtoken** | JWT token generation & verification |
| **axios**        | HTTP client for external APIs       |
| **dotenv**       | Environment variables management    |

---

## 📝 Environment Variables

```env
# Server Configuration
PORT=8089                    # Server port
NODE_ENV=development         # development or production

# Database Configuration
DB_CONNECTION=...           # MongoDB connection string
DB_NAME=test                # Database name

# Authentication
JWT_SECRET=super-secret-key # Secret for JWT signing

# External APIs
NEWS_API_KEY=...           # NewsAPI.org API key
```

---

## ✅ Testing

Run the test suite:

```bash
npm run test
```

Tests cover:

- User signup & login
- Duplicate email validation
- Authentication with/without token
- User preferences (get & update)
- News fetching with authentication

---

## 🎓 Learning Outcomes

This project demonstrates:

✅ **Security:**

- Password hashing with bcryptjs
- JWT-based authentication
- Protected routes
- Input validation

✅ **Performance:**

- In-memory caching with TTL
- API rate limit optimization
- Request/response logging

✅ **Best Practices:**

- MVC architecture
- Centralized error handling
- Logging utility
- Environment configuration
- RESTful API design

✅ **Node.js/Express:**

- Middleware implementation
- Async/await patterns
- Error handling
- MongoDB integration

---

## 📄 License

This is an educational project by Airtribe Engineering Learners.
