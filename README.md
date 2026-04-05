# SmartAqua 💧 — Water Jar Delivery Platform (V2)

A production-ready, full-stack water jar delivery application built with the MERN-adjacent stack (Supabase + Express + React + Node.js), featuring real-time order tracking via Socket.IO, OSRM-powered delivery maps, Razorpay payments, and Gemini AI demand insights.

---

## 🚀 Tech Stack

| Layer       | Technology                                                          |
|-------------|---------------------------------------------------------------------|
| Frontend    | React 18 + Vite, React Router v6, React-Leaflet (Leaflet.js)       |
| Backend     | Node.js, Express.js, Socket.IO                                      |
| Database    | Supabase (PostgreSQL)                                               |
| Auth        | Supabase Auth (JWT)                                                 |
| Maps        | React-Leaflet + OSRM (free routing, no API key needed)             |
| Payments    | Razorpay (test mode)                                                |
| AI          | Google Gemini 1.5 Flash (demand predictions)                        |
| Charts      | Chart.js + react-chartjs-2                                          |
| Realtime    | Socket.IO (order notifications)                                     |
| Styling     | Vanilla CSS (Aqua-Material Glassmorphism Design)                    |
| Toasts      | React Hot Toast                                                     |
| Deploy      | Render (backend) + Vercel (frontend)                                |

---

## ⚙️ Prerequisites

- Node.js >= 18
- A [Supabase](https://supabase.com) project
- npm

---

## 🛠️ Local Setup

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**backend/.env**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Supabase — https://supabase.com/dashboard → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Razorpay — https://dashboard.razorpay.com → API Keys
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Gemini AI — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev     # http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev     # http://localhost:5173
```

---

## 🌍 Production Deployment

### Backend → Render

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service**.
3. Connect your repo and set **Root Directory** to `backend`.
4. Render will auto-detect `render.yaml` and use:
   - **Build command**: `npm install`
   - **Start command**: `node server.js`
5. Add environment variables in the Render dashboard:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | `https://your-app.vercel.app` |
   | `SUPABASE_URL` | your Supabase URL |
   | `SUPABASE_ANON_KEY` | your anon key |
   | `SUPABASE_SERVICE_KEY` | your service role key |
   | `RAZORPAY_KEY_ID` | your Razorpay key |
   | `RAZORPAY_KEY_SECRET` | your Razorpay secret |
   | `GEMINI_API_KEY` | your Gemini key |
6. Deploy. Note your Render URL (e.g. `https://smartaqua-backend.onrender.com`).

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variables:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://smartaqua-backend.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://smartaqua-backend.onrender.com` |
   | `VITE_RAZORPAY_KEY_ID` | your Razorpay test key |
4. Deploy. Vercel reads `vercel.json` for SPA routing rewrites automatically.
5. Copy your Vercel URL and update `CLIENT_URL` in Render environment variables.

---

## 🔒 Security

- Supabase Row Level Security (RLS)
- JWT tokens via Supabase Auth
- Role-based middleware (`userOnly`, `vendorOnly`)
- Razorpay HMAC signature verification
- 401 auto-logout on expired token

---


## 📄 License

MIT — Free to use and modify.

