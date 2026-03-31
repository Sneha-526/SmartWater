# SmartAqua V2 — Upgrade Task Tracker

## Phase 1: Install Packages
- [x] Install react-leaflet + leaflet in frontend
- [ ] Install @google/generative-ai in backend

## Phase 2: CSS / Design
- [ ] Enhance index.css (glassmorphism + neumorphism + animations)

## Phase 3: Map (OSRM routing, no API key)
- [ ] Rewrite DeliveryMap.jsx (OSRM routing, directions, distance/ETA, Zomato-style)

## Phase 4: Expanded Catalog
- [ ] Rewrite PlaceOrder.jsx (7 category tabs from API, premium UI)

## Phase 5: Razorpay Payment
- [ ] Add frontend/src/utils/razorpay.js
- [ ] Wire Razorpay flow in PlaceOrder.jsx

## Phase 6: Gemini AI Prediction
- [ ] Update backend/routes/predict.js (Gemini integration)
- [ ] Update backend/.env (add GEMINI_API_KEY placeholder)

## Phase 7: AI Insights Page
- [ ] Create DemandInsights.jsx
- [ ] Update App.jsx (add /user/insights route)
- [ ] Update UserDashboard.jsx (add insights CTA)

## Phase 8: Vendor Dashboard
- [ ] Update VendorDashboard.jsx (distance to customer, directions link)

## Phase 9: Deployment
- [ ] Create backend/render.yaml
- [ ] Create frontend/vercel.json
- [ ] Update README.md with deployment steps
