# UrbanRide Rentals

A full-stack vehicle rental system built as a dependency-light Node.js project with a polished frontend and JSON-backed backend.

## What this project includes

- Customer and admin authentication with seeded demo accounts
- Vehicle catalog with filters for city, category, fuel, seating, and date availability
- Dynamic quote calculation with coupons, add-ons, taxes, and refundable deposit
- Booking creation flow with pickup and dropoff locations
- QR-based payment experience using a UPI payment payload
- Booking management with payment confirmation, cancellation, and invoice download
- Review submission for completed trips
- Support ticket workflow
- Admin dashboard for metrics, fleet status, bookings, tickets, and vehicle creation
- Seed data for vehicles, bookings, reviews, coupons, and support tickets

## Tech stack

- Backend: Node.js native `http` server
- Frontend: HTML, CSS, vanilla JavaScript
- Persistence: local JSON file at `data/store.json`
- Payment demo: UPI payment payload plus hosted QR image rendering

## Project structure

```text
.
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── data/
├── package.json
└── server.js
```

## Run locally

This project does not require external packages.

```bash
node server.js
```

The app starts on:

```text
http://127.0.0.1:3000
```

Optional:

```bash
HOST=127.0.0.1 PORT=3000 node server.js
```

If you have `npm` available on your machine, you can also use:

```bash
npm start
```

## Run on GitHub Codespaces

This repo now includes a ready-to-use Codespaces config at `.devcontainer/devcontainer.json`.

1. Create a new empty GitHub repository.
2. Push this project:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

3. On GitHub, open the repo.
4. Click `Code` -> `Codespaces` -> `Create codespace on main`.
5. In the Codespaces terminal, run:

```bash
node server.js
```

6. Open the forwarded port `3000` in the browser when prompted.

Why Codespaces:

- GitHub Pages will not run this app because Pages is for static sites.
- This project has a Node backend, so Codespaces is the easiest GitHub-native way to run it.

## Demo accounts

- Customer
  - Email: `aisha@urbanride.demo`
  - Password: `aisha123`
- Admin
  - Email: `admin@urbanride.demo`
  - Password: `admin123`

## Main API routes

- `GET /api/bootstrap`
- `GET /api/vehicles`
- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `POST /api/quote`
- `GET /api/bookings`
- `POST /api/bookings`
- `PATCH /api/bookings/:id/status`
- `GET /api/bookings/:id/payment/qr`
- `POST /api/bookings/:id/payment/confirm`
- `GET /api/bookings/:id/invoice`
- `POST /api/reviews`
- `GET /api/tickets`
- `POST /api/tickets`
- `GET /api/admin/dashboard`
- `POST /api/vehicles`
- `PUT /api/vehicles/:id`

## Notes

- `data/store.json` is created automatically on first run.
- QR images are rendered through `api.qrserver.com` for demo convenience. In production, replace this with Razorpay, Stripe, PhonePe, Paytm, or your preferred payment provider.
- Passwords are hashed with SHA-256 for the demo, but production systems should use a slow password hashing algorithm such as bcrypt or Argon2.
