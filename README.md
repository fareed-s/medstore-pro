# MedStore Pro — Complete Pharmacy Management System

> Multi-Tenant SaaS Platform for Pharmacies, Medical Stores & Drug Distribution

## 🚀 Phase 1 — Core Foundation

### What's included
- **Auth & Multi-tenancy** — Store registration, JWT httpOnly cookies, 5 roles (SuperAdmin, StoreAdmin, Pharmacist, Cashier, InventoryStaff)
- **Medicine Master (40+ fields)** — Brand/generic names, barcode, categories, drug schedules (OTC/H/H1/X), formulations, pricing (cost/MRP/sale/wholesale), margin calculation, rack locations, storage conditions
- **5000+ Pre-seeded Medicines** — Common Pakistani/international medicines with proper generics, manufacturers, and batch data
- **Batch/Lot Inventory** — FEFO (First Expiry First Out), batch tracking, expiry dashboard (30/60/90 day color bands), stock adjustments
- **Categories Management** — Create/edit/delete product categories
- **Inventory Overview** — Stock value (cost + retail), category breakdown, out-of-stock alerts, low stock tracking
- **Expiry Dashboard** — Color-coded expired/near-expiry batches with value calculation
- **Staff Management** — Create staff with role-based permissions, activate/deactivate
- **Store Settings** — POS config, alerts, tax, receipt width
- **SuperAdmin Panel** — Global stats, store approval, plan management
- **Dashboard** — KPIs, charts (Recharts), low stock alerts
- **Premium UI** — Emerald green medical theme, DM Sans + Outfit fonts, responsive
- **Docker Deployment** — docker-compose with MongoDB, Node, Nginx

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, MongoDB (Mongoose), JWT, Zod, Helmet, bcrypt, node-cron |
| Frontend | React 18, Vite, Tailwind CSS, Context API + useReducer, React Router v6, Recharts, React Toastify |
| DevOps | Docker, docker-compose, GitHub Actions, Nginx |

### Quick Start

```bash
# 1. Clone & install
git clone <repo-url> && cd medstore-pro
cd backend && npm install && cd ../frontend && npm install && cd ..

# 2. Start MongoDB (local or Atlas)
# Update backend/.env with your MONGODB_URI

# 3. Seed database (5000+ medicines)
cd backend && npm run seed

# 4. Run dev servers
cd .. && npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:5173
```

### Docker Deployment
```bash
docker-compose up --build -d
# App: http://localhost
# API: http://localhost:5000
```

### Login Credentials (after seed)
| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | superadmin@medstore.com | admin123456 |
| StoreAdmin | admin@alshifa.com | admin123456 |
| Pharmacist | pharmacist@alshifa.com | admin123456 |
| Cashier | cashier@alshifa.com | admin123456 |
| Inventory | inventory@alshifa.com | admin123456 |

### API Endpoints (Phase 1)

**Auth:** POST `/api/auth/register`, `/login`, GET `/me`, POST `/logout`
**Medicines:** GET/POST `/api/medicines`, GET/PUT/DELETE `/:id`, GET `/search`, `/barcode/:code`, `/low-stock`, `/expiring`, `/substitutes/:id`, POST `/bulk-import`
**Categories:** CRUD `/api/categories`
**Batches:** GET/POST `/api/batches`, PUT `/:id`, GET `/expiry-dashboard`, POST `/adjust`, GET `/adjustments`
**Inventory:** GET `/api/inventory/overview`, `/category-stock`
**Users:** CRUD `/api/users`, PUT `/:id/reset-password`
**Store:** GET/PUT `/api/stores`, PUT `/settings`
**Dashboard:** GET `/api/dashboard/stats`
**SuperAdmin:** GET `/api/superadmin/stats`, `/stores`, PUT `/stores/:id/approve`, `/toggle`, `/plan`

### Project Structure
```
medstore-pro/
├── backend/
│   ├── config/          # DB, constants
│   ├── controllers/     # Route handlers
│   ├── middleware/       # Auth, validation
│   ├── models/          # Mongoose schemas (8 models)
│   ├── routes/          # Express routes
│   ├── seeds/           # 5000+ medicines seed
│   ├── utils/           # Helpers, error handler
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/  # Layout (sidebar, header)
│       ├── context/     # AuthContext (useReducer)
│       ├── pages/       # All page components
│       └── utils/       # API client, helpers
├── docker-compose.yml
└── .github/workflows/
```

### Upcoming Phases
- **Phase 3:** Batch/Expiry (enhanced FEFO, stock adjustments, rack locations)
- **Phase 4:** Purchase Orders, Suppliers, GRN, Supplier Ledger
- **Phase 5:** Customer CRM, Credit, Prescriptions, Drug Interactions
- **Phase 6:** Financial (Cash Register, Expenses, P&L, GST/Tax)
- **Phase 7:** Drug Regulatory (Schedule tracking, Narcotic register)
- **Phase 8:** Offline PWA, Multi-branch, WhatsApp, AI, Reports, DevOps

---

## Phase 2 — POS Terminal & Billing

### What's included
- **Full-Screen POS Terminal** — Dedicated billing screen without sidebar, optimized for speed
- **Smart Search** — Type medicine name/generic/barcode with 200ms debounced auto-search, shows stock + price + rack location
- **Barcode Scanning** — USB scanner support (auto-detects rapid input + Enter), adds to cart instantly
- **FEFO Stock Deduction** — System auto-picks nearest-expiry batch when selling. Deducts from multiple batches if needed.
- **Cart Management** — Add/remove items, +/- quantity controls, per-item discount, auto tax calculation, line totals
- **Multiple Payment Methods** — Cash (with change calc), Card, UPI, Credit — with reference tracking
- **Split Payments** — Part cash + part card supported
- **Overall Bill Discount** — Percentage-based discount on entire bill
- **Hold & Resume Bills** — Hold current cart (F5), resume from list, auto-expires after 24hr. Multiple held bills at once.
- **Void Sales** — Pharmacist/Admin can void completed sales with reason. Stock auto-restored.
- **Returns/Exchanges** — Select items to return, choose refund method (cash/credit note/exchange/card), stock auto-restored to batch
- **Receipt View** — Full receipt with store info, DL number, items + batch + expiry, tax breakdown, payment details, print support
- **Today's Summary** — Real-time KPIs: total sales count, revenue, avg bill value, items sold, payment breakdown
- **Sales History** — Search by invoice/customer, filter by status/date, pagination
- **Keyboard Shortcuts** — F2: Search, F5: Hold, F8: Pay, F10: Complete, Esc: Close modals
- **Controlled Drug Tracking** — Auto-flags sales containing Schedule H/H1/X drugs, enforces max quantity per sale
- **Audit Trail** — Every sale, void, and return logged with user + timestamp

### New Backend Models (Phase 2)
- **Sale** — Full invoice with items[], payments[], status, void tracking, return tracking
- **HeldSale** — Temporary held bills with 24hr expiry
- **SaleReturn** — Return records linked to original sale with item-level tracking
- **Counter** — Atomic sequential invoice number generator (INV-2504-00001 format)

### New API Endpoints (Phase 2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sales` | Create sale (POS billing) |
| GET | `/api/sales` | List sales with filters |
| GET | `/api/sales/today-summary` | Today's KPIs + payment breakdown |
| GET | `/api/sales/:id` | Sale detail + store info for receipt |
| POST | `/api/sales/:id/void` | Void a sale |
| POST | `/api/sales/:id/return` | Process return |
| POST | `/api/sales/hold` | Hold current cart |
| GET | `/api/sales/held` | List held bills |
| POST | `/api/sales/held/:id/resume` | Resume held bill |
| DELETE | `/api/sales/held/:id` | Delete held bill |
| GET | `/api/sales/returns` | List all returns |

### POS Keyboard Shortcuts
| Key | Action |
|-----|--------|
| F2 | Focus search bar |
| F5 | Hold current bill |
| F8 | Open payment panel |
| F10 | Complete sale |
| Esc | Close modals |
| Enter (in search) | Barcode scan auto-add |
