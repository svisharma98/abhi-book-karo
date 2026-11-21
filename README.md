# Book Kare Abhi

A single frontend and backend deployment serves the public website and separate Client, Owner, and Admin dashboards.

## Project structure

- `frontend/src/Website/` — public pages, login, and role-based routing.
- `frontend/src/Client/` — client dashboard and booking requests.
- `frontend/src/Owner/` — owner booking calendar, booking management, and services.
- `frontend/src/Admin/` — admin dashboard and user management.
- `backend/src/Website/` — authentication routes.
- `backend/src/Client/` — client booking routes, scoped to the signed-in client.
- `backend/src/Owner/` — owner booking and service management routes.
- `backend/src/Admin/` — admin-only user and summary routes.
- `backend/src/shared/` — booking data shared by the client and owner APIs.
- `backend/src/db.js` — SQLite schema, migrations, and demo account seeding.

The root `frontend/` and `backend/` directories are the supported app. The older `Client/` and `Owner-Admin/` app copies are legacy; do not start their servers.

## Requirements and setup

- Node.js 20 or later
- npm

Install dependencies:

```sh
npm --prefix backend install
npm --prefix frontend install
```

Create `backend/.env` from `backend/.env.example`. Set a unique `JWT_SECRET` with at least 32 characters and a strong `ADMIN_PASSWORD` with at least 12 characters. Keep `.env` private. Existing accounts and booking data are preserved during database migration.

### Demo accounts

| Panel | Email | Password |
|---|---|---|
| Client | `test@client.com` | `test12345` |
| Owner | `test@owner.com` | `test12345` |
| Admin | `test@admin.com` | `test12345` |

These are for local testing only. Replace demo credentials before deployment.

## Run locally

Start the backend and frontend in separate terminals:

```sh
npm --prefix backend run dev
npm --prefix frontend run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend at `http://localhost:4001`.

## Deploy as one service

Build the frontend, then run the backend:

```sh
npm --prefix frontend run build
npm --prefix backend start
```

The backend serves the frontend build and API from one port. Deploy the root `frontend/` and `backend/` folders together and use persistent storage for `backend/data/bookkareabhi.sqlite`.

## Features

- Clients can view only their own booking requests and respond to owner price offers.
- Booking requests collect the selected service, booking date and time, customer contact details, start and destination locations, and optional notes.
- Owners can set a booking's total amount and record each installment received. Paid and due amounts are calculated automatically, with payment history shown to both owner and client. This records payments received; it does not process them online.
- Owners can view and manage all bookings, accept or reject requests, negotiate prices, and manage services including Van Booking.
- The owner calendar shows booking information on hover; clicking an event opens full details and actions.
- Admins can view dashboard totals and the registered user list.

Booking requests do not reserve a provider or process payments. Availability, final pricing, and service details must be confirmed by the owner. Email delivery and payment processing are not configured.

Use HTTPS, strong unique secrets, backups, and persistent database storage in production.
