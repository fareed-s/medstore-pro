# MedStore Pro — Pharmacy Management System (Local Setup)

Multi-tenant pharmacy SaaS — POS, inventory, customers, regulatory, reports.
This branch is configured for **local development only**: no Docker, no Vercel,
no remote deployment files.

## Stack

| Layer    | Technology                                                                        |
|----------|-----------------------------------------------------------------------------------|
| Backend  | Node.js, Express, MongoDB (Mongoose), JWT, Helmet, bcrypt, node-cron              |
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Recharts, React Toastify           |

## Prerequisites

1. **Node.js 18+** — `node -v`
2. **MongoDB 6+ running locally** on `mongodb://127.0.0.1:27017`
   - Windows: install MongoDB Community Server (it auto-starts as a service)
   - macOS:   `brew services start mongodb-community`
   - Linux:   `sudo systemctl start mongod`

## Install & Run

```bash
# 1. From the project root, install all packages (root + backend + frontend)
npm run install:all

# 2. Seed the database (creates demo store, users, medicines, batches, customers, suppliers)
npm run seed

# 3. Start backend + frontend together
npm run dev
```

- Backend:  http://localhost:5000
- Frontend: http://localhost:5173
- Health:   http://localhost:5000/api/health

The Vite dev server proxies `/api/*` to the backend, so the frontend just calls
`/api/...` and cookies/CORS work out of the box.

## Default Login Credentials (after seed)

| Role        | Email                       | Password    |
|-------------|-----------------------------|-------------|
| SuperAdmin  | superadmin@medstore.com     | admin123456 |
| StoreAdmin  | admin@alshifa.com           | admin123456 |
| Pharmacist  | pharmacist@alshifa.com      | admin123456 |
| Cashier     | cashier@alshifa.com         | admin123456 |
| Inventory   | inventory@alshifa.com       | admin123456 |

## Role-Based Access Control

Each user has both a **Role** (Pharmacist, Cashier, …) and a **per-module
permission matrix** with `view / add / edit / delete` actions per module
(Medicines, Inventory, Sales, Customers, Suppliers, Reports, Staff, …).

- Module list lives in `backend/config/modules.js`, mirrored at
  `frontend/src/utils/modules.js`. Keep them in sync.
- StoreAdmin manages staff and their permissions from **Settings → Staff**.
- Permission helpers:
  - Backend: `req.user.can('medicines', 'add')` and the
    `requirePermission('medicines', 'add')` middleware
    (see `backend/middleware/auth.js`).
  - Frontend: `useAuth().can('medicines', 'add')` or the `<Can module="..."
    action="...">` component (see `frontend/src/components/Can.jsx`).

SuperAdmin and StoreAdmin always pass every check — the matrix only applies
to Pharmacist / Cashier / InventoryStaff.

## Environment Files

- `backend/.env`  — Mongo URI, JWT secret, ports, CORS origin (already set for
  local development).
- `frontend/.env` — `VITE_API_URL=/api` so requests go through the Vite proxy.

## Project Layout

```
medstore-pro/
├── backend/
│   ├── config/         # modules.js (RBAC catalogue), constants, db
│   ├── controllers/
│   ├── middleware/     # auth, validate
│   ├── models/         # Mongoose schemas
│   ├── routes/
│   ├── seeds/          # `npm run seed` entry
│   ├── utils/
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/ # layout, Can.jsx
│       ├── context/    # AuthContext
│       ├── pages/      # all features
│       └── utils/      # api, helpers, modules
└── package.json        # root scripts (dev / install:all / seed / start)
```

## Common Scripts

| From repo root         | What it does                                             |
|------------------------|----------------------------------------------------------|
| `npm run install:all`  | Install root + backend + frontend dependencies           |
| `npm run dev`          | Start backend (nodemon) and frontend (Vite) together     |
| `npm run seed`         | Reset DB and reseed demo data                            |
| `npm run start`        | Start backend in production mode (no nodemon)            |
| `npm run build`        | Build the frontend for static hosting                    |

## Troubleshooting

- **`MongoNetworkError` on startup** — MongoDB isn't running. Start the service.
- **Login loops back** — clear localStorage (`user` + `token`) and hard refresh.
- **Seed script complains about existing data** — that's fine, it wipes and
  reseeds. To inspect data without wiping, comment out the `deleteMany` block
  in `backend/seeds/index.js`.
