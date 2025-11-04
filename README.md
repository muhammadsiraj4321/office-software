# Office Ops — Operations Dashboard

A secure web application for monitoring and controlling office operations, including expenses, income, and project tracking.

## Tech Stack
- Backend: Node.js + Express (JWT auth, RBAC), JSON persistence
- Frontend (app): React + Vite + TailwindCSS, React Router, Zustand

## Quick Start

### Backend
1. Open a terminal in `backend` and install deps:
   - `npm install`
2. Start the API (default used in this repo is 3003):
   - PowerShell: `$env:PORT="3003"; cmd /c npm start`
   - or CMD: `cmd /c "set PORT=3003 && npm start"`
3. Health check: http://localhost:3003/api/health

Credentials (dev):
- Owner Admin (full permissions):
  - Email: `sirajaldhab@gmail.com`
  - Password: `siraj123`
- Built-in Admin (fallback):
  - Email: `admin@company.com`
  - Password: `admin123`

### Frontend (React)
1. Open a terminal in `frontend-react` and install deps:
   - `npm install`
2. Start the dev server:
   - `npm run dev`
3. App URL: http://localhost:5173

Auth flow: sign in with the credentials above (no auto-login). If you create a new account via Signup, it must be approved by an Admin before first login.

## Scripts (frontend-react)
- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run preview` — Preview build locally
- `npm run lint` — Run ESLint
- `npm run format` — Run Prettier (write)

## Structure
- `backend/` — Express API, routes, middleware, data persistence (`src/data/db.json`)
- `frontend-react/` — React app with pages:
  - Dashboard (4+1 cards including Documents)
  - Income (filters, CRUD)
  - Expenses (filters, CRUD)
  - Projects (tabs, CRUD)
  - Documents (Company Profile, Trade License, VAT Certificate; role-based upload/download)

## RBAC overview
- Admin: Approve/remove users, assign roles, view all activity logs, and add/edit/delete all data. Can log in always; others require approval.
- GM: View all data and activity logs; can add and edit any data; can delete only own entries.
- Manager & Accountant: View all data; can edit/delete only their own entries within 24 hours of creation.
- Employee: Can add expenses; can see and edit only their own expenses; edit allowed within 1 hour; no access to Documents.

Time windows are enforced server-side and reflected in the UI. Activity is logged for every create/update/delete.

## Notes
- Tailwind classes compile at runtime (IDE may show @tailwind/@apply warnings).
- For production: replace JSON persistence with a real database (e.g., PostgreSQL/MongoDB).
