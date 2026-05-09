# UrbanRide Rentals

UrbanRide Rentals is a deployable full-stack vehicle rental website built with a lightweight Node.js backend and a responsive frontend. It supports public fleet browsing, self-service customer registration, booking workflows, UPI QR payment instructions, support tickets, and staff operations.

## Features

- Public vehicle catalog with filters for city, category, fuel type, seating, and availability window
- Customer registration and sign-in
- Booking flow with live quote calculation, coupons, add-ons, taxes, and refundable deposits
- UPI QR payment instructions with invoice download
- Booking cancellation, review submission, and support tickets
- Staff dashboard for fleet updates, booking operations, ticket resolution, and vehicle creation
- JSON persistence in `data/store.json`
- Environment-based company and admin configuration for deployment
- Docker support and GitHub Codespaces support

## Project structure

```text
.
├── .devcontainer/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .dockerignore
├── Dockerfile
├── package.json
└── server.js
```

## Run locally

This project has no external runtime dependencies beyond Node.js.

```bash
node server.js
```

The app will be available at:

```text
http://127.0.0.1:3000
```

Optional:

```bash
HOST=0.0.0.0 PORT=3000 node server.js
```

If `npm` is available on your machine, you can also use:

```bash
npm start
```

## Environment variables

Set these before the first production start, especially for staff access:

- `ADMIN_EMAIL`: email address for the operations admin account
- `ADMIN_PASSWORD`: password for the operations admin account
- `ADMIN_NAME`: optional display name for the admin account
- `ADMIN_PHONE`: optional phone number for the admin account
- `COMPANY_NAME`: optional company name override
- `SUPPORT_PHONE`: optional support phone override
- `SUPPORT_EMAIL`: optional support email override
- `UPI_ID`: optional UPI ID override
- `CITY_COVERAGE`: optional comma-separated list of supported cities
- `HOST`: bind host, defaults to `0.0.0.0`
- `PORT`: server port, defaults to `3000`

Example:

```bash
export ADMIN_EMAIL=ops@yourdomain.com
export ADMIN_PASSWORD='replace-with-a-strong-password'
export ADMIN_NAME='UrbanRide Operations'
export SUPPORT_EMAIL=support@yourdomain.com
export SUPPORT_PHONE='+91 98765 43210'
export UPI_ID='payments@yourupi'
node server.js
```

Notes:

- Customer accounts are created through the registration form in the website.
- Historical reviews and past bookings are seeded automatically to populate the storefront, but public login credentials are not exposed.
- If you add `ADMIN_EMAIL` and `ADMIN_PASSWORD` later, the app will sync that staff account on startup.

## Deployment

### Direct Node deployment

Start the application with:

```bash
node server.js
```

### Docker

Build and run:

```bash
docker build -t urbanride-rentals .
docker run -p 3000:3000 \
  -e ADMIN_EMAIL=ops@yourdomain.com \
  -e ADMIN_PASSWORD='replace-with-a-strong-password' \
  urbanride-rentals
```

### GitHub Codespaces

1. Open the repository on GitHub.
2. Click `Code` -> `Codespaces` -> `Create codespace on main`.
3. In the Codespaces terminal, run:

```bash
node server.js
```

4. Open forwarded port `3000`.

## API routes

- `GET /api/health`
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
- `PATCH /api/tickets/:id`
- `GET /api/admin/dashboard`
- `POST /api/vehicles`
- `PUT /api/vehicles/:id`

## Operational notes

- `data/store.json` is created automatically on first run and is intentionally ignored by Git.
- QR images are still rendered through `api.qrserver.com`. For regulated production payment flows, replace this with a managed payment integration such as Razorpay, Stripe, PhonePe, or Paytm.
- Passwords are hashed with SHA-256 for simplicity. For higher-security production deployments, migrate to bcrypt or Argon2.
