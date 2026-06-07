# Prestige Suits — Demo Ecommerce App

A full-stack demo ecommerce site for listing and selling suits, with admin login, image uploads, and invoice generation.

---

## Project Structure

```
prestige-suits/
├── backend/
│   ├── server.js        ← Express API
│   └── package.json
└── frontend/
    ├── index.html       ← Full frontend (single HTML file)
    └── public/
        └── uploads/     ← Uploaded product images stored here
```

---

## Setup & Run

### 1. Start the Backend

```bash
cd backend
node server.js
```

Server starts at: **http://localhost:3001**

### 2. Open the Frontend

Open `frontend/index.html` directly in your browser.

> Or serve it with any static server:
> ```bash
> npx serve frontend/
> ```

---

## Admin Login

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

Click **Admin** in the nav → you'll be redirected to the login page.

---

## Features

### Customer Side
- Browse suits with product images
- Add to cart, adjust quantities
- **Manual order date** — customer can set any date (past or future)
- Cart persists via localStorage
- Place order → invoice shown immediately

### Admin Dashboard
- Protected login (JWT-based, 8-hour session)
- **Add Suit** — with image upload (stored on server in `/uploads/`)
- **Manage Suits** — view all products, delete them
- **Orders** — view all orders, update status (Pending → Processing → Delivered → Cancelled)
- **Invoice** — view and print a professional invoice for any order
- Dashboard stats: total suits, orders, revenue, pending count

### Invoice
- Auto-generated with invoice number
- Shows the **manually set order date**
- Includes product images, itemized table, 5% tax, grand total
- Print-ready PDF via browser print

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | — | Admin login |
| GET | /api/auth/verify | ✓ | Verify token |
| GET | /api/suits | — | List all suits |
| POST | /api/suits | ✓ | Add suit (multipart) |
| PUT | /api/suits/:id | ✓ | Update suit |
| DELETE | /api/suits/:id | ✓ | Delete suit |
| POST | /api/orders | — | Place order |
| GET | /api/orders | ✓ | All orders |
| PUT | /api/orders/:id/status | ✓ | Update status |
| GET | /api/stats | ✓ | Dashboard stats |

> **Note:** Data is in-memory; it resets when the server restarts. Swap out the arrays in `server.js` with a real DB (SQLite, MongoDB, etc.) for persistence.
