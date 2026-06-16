# UniStore — Uniform Store Management App

A full-stack uniform inventory and order management system.

## Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + Recharts
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3, file-based, no setup needed)

## Getting Started

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev        # uses nodemon for auto-reload
# or: npm start   # plain node
```

The API server runs on **http://localhost:3001**.  
The SQLite database (`db.sqlite`) is created automatically on first run, and seeded with sample data.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens on **http://localhost:5173** (Vite's default port).

---

## Features

| Page | Description |
|------|-------------|
| 🏠 Dashboard | Overview stats: total stock, pending orders, clients, low-stock alerts |
| 📦 Stock | Full inventory table, add/edit/delete items, inline quantity editing |
| 📋 Orders | Order list, create orders with line items, view details, update status |
| 👥 Clients | Card grid with client info, photo upload, order history |
| 📊 Analytics | Charts by category (units & value), full stock status table |

## API Routes

### Stock — `/api/stock`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stock` | All stock items |
| GET | `/api/stock/low` | Items at or below low-stock threshold |
| POST | `/api/stock` | Create stock item |
| PUT | `/api/stock/:id` | Update stock item |
| DELETE | `/api/stock/:id` | Delete stock item |

### Clients — `/api/clients`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clients` | All clients |
| GET | `/api/clients/:id` | Client + order history |
| POST | `/api/clients` | Create client (multipart/form-data for image) |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client + all orders |

### Orders — `/api/orders`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | All orders with client info |
| GET | `/api/orders/:id` | Order detail with line items |
| POST | `/api/orders` | Create order with items array |
| PUT | `/api/orders/:id` | Update status/notes |
| DELETE | `/api/orders/:id` | Delete order |
| GET | `/api/orders/analytics/stock-summary` | Analytics summary |

## Project Structure

```
uniform-store/
  backend/
    server.js          Express app entry point
    database.js        SQLite setup + seeding
    routes/
      clients.js
      orders.js
      stock.js
    uploads/           Client photos stored here
    db.sqlite          Auto-created SQLite file
  frontend/
    src/
      App.jsx          Main app with page routing
      components/
        Sidebar.jsx
        Dashboard.jsx
        StockManager.jsx
        OrdersManager.jsx
        ClientsManager.jsx
        Analytics.jsx
```
