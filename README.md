# SmartAqua 💧 — Water Jar Delivery Platform

A production-ready, full-stack water jar delivery application built with the MERN stack (MongoDB, Express, React, Node.js), featuring real-time order tracking via Socket.IO and map integration via Leaflet.

---

## 🚀 Tech Stack

| Layer     | Technology                              |
|-----------|----------------------------------------|
| Frontend  | React 18 + Vite, React Router, Leaflet, Socket.IO Client |
| Backend   | Node.js, Express.js, Socket.IO         |
| Database  | MongoDB + Mongoose                      |
| Auth      | JWT (7-day tokens, localStorage)       |
| Maps      | React-Leaflet (OpenStreetMap)          |
| Styling   | Vanilla CSS (Aqua-Material Design)     |
| Toasts    | React Hot Toast                        |

---

## 📁 Project Structure

```
SmartWater/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # JWT + role middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Vendor.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── users.js
│   │   ├── vendors.js
│   │   └── orders.js
│   ├── socket/
│   │   └── socketManager.js     # Socket.IO event manager
│   ├── server.js
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── DeliveryMap.jsx   # Leaflet map
    │   │   ├── OrderCard.jsx
    │   │   ├── OrderTimeline.jsx
    │   │   └── LoadingScreen.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx   # JWT + persistent login
    │   │   └── SocketContext.jsx # Socket.IO client
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── auth/
    │   │   │   ├── UserAuth.jsx
    │   │   │   └── VendorAuth.jsx
    │   │   ├── user/
    │   │   │   ├── UserDashboard.jsx
    │   │   │   ├── PlaceOrder.jsx
    │   │   │   └── OrderHistory.jsx
    │   │   └── vendor/
    │   │       └── VendorDashboard.jsx
    │   ├── utils/
    │   │   ├── api.js            # Axios + interceptors
    │   │   └── helpers.js        # Constants + formatters
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css             # Complete design system
    ├── index.html
    ├── vite.config.js
    ├── .env
    └── package.json
```

---

## ⚙️ Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm

---

## 🛠️ Setup and Run

### 1. Start MongoDB

Make sure MongoDB is running locally:
```bash
mongod
```
Or update `MONGO_URI` in `backend/.env` to use MongoDB Atlas.

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. Configure Environment Variables

**backend/.env** (already created):
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/smartaqua
JWT_SECRET=smartaqua_super_secret_jwt_key_2024
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**frontend/.env** (already created):
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 5. Run the Backend
```bash
cd backend
npm run dev
```
Server starts at: http://localhost:5000

### 6. Run the Frontend
```bash
cd frontend
npm run dev
```
App available at: http://localhost:5173

---

## 🌐 API Reference

### Auth
| Method | Endpoint                  | Access  |
|--------|---------------------------|---------|
| POST   | /api/users/register       | Public  |
| POST   | /api/users/login          | Public  |
| GET    | /api/users/me             | User    |
| POST   | /api/vendors/register     | Public  |
| POST   | /api/vendors/login        | Public  |
| GET    | /api/vendors/me           | Vendor  |
| PUT    | /api/vendors/availability | Vendor  |

### Orders
| Method | Endpoint                  | Access  |
|--------|---------------------------|---------|
| POST   | /api/orders               | User    |
| GET    | /api/orders/user          | User    |
| GET    | /api/orders/vendor        | Vendor  |
| PUT    | /api/orders/:id/accept    | Vendor  |
| PUT    | /api/orders/:id/status    | Vendor  |
| PUT    | /api/orders/:id/reject    | Vendor  |

### Health
| Method | Endpoint | Access  |
|--------|----------|---------|
| GET    | /health  | Public  |

---

## 💧 Jar Pricing

| Jar Size | Price   |
|----------|---------|
| 1L       | ₹10     |
| 2L       | ₹18     |
| 10L      | ₹60     |
| 20L      | ₹100    |

---

## ⚡ Real-time Socket Events

| Event               | Direction            | Description                    |
|---------------------|----------------------|--------------------------------|
| user:register       | Client → Server      | Register user's socket ID       |
| vendor:register     | Client → Server      | Register vendor's socket ID     |
| newOrder            | Server → Vendors     | New order broadcast to vendors  |
| orderAccepted       | Server → User        | Notify user their order was accepted |
| orderStatusUpdate   | Server → User        | Push status changes to user     |
| orderUnavailable    | Server → Vendors     | Remove taken order from feed    |

---

## 📱 Features

### Customer
- Register / Login
- Place orders with GPS + map click location
- Select 1L, 2L, 10L, 20L jars with quantity
- Auto price calculation
- Cash on delivery / Online (placeholder)
- Real-time order tracking
- Vendor info revealed after acceptance
- Order history with filters
- Status timeline UI

### Vendor
- Register / Login
- Real-time new order feed (Socket.IO)
- Accept / Reject pending orders
- Status flow: accepted → on_the_way → delivered
- Map preview of delivery location
- Revenue stats
- Availability toggle
- Multi-vendor prevention (first-accept-wins)

---

## 🔒 Security

- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens with 7-day expiry
- Role-based middleware (`userOnly`, `vendorOnly`)
- Order ownership validation before status update
- 401 auto-logout on expired token

---

## 🐛 Troubleshooting

**MongoDB connection error:**
→ Make sure `mongod` is running or update `MONGO_URI` to Atlas

**Port conflict:**
→ Change PORT in `backend/.env` and update `VITE_API_URL` in `frontend/.env`

**Map not loading:**
→ Check internet connection (uses OpenStreetMap tiles)

**GPS not working:**
→ Must be on HTTPS or localhost; browser will block GPS on HTTP in production

---

## 📄 License

MIT — Free to use and modify.
