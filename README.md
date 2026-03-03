# STLL Haus POS

A modern, touchscreen-friendly point-of-sale system for STLL Haus café.  
Built with **FastAPI** (Python) backend and **Next.js** (TypeScript) frontend.

---

## Features

- Tap-to-order menu grid with cart management
- Cash / EFTPOS payment selection
- Sales dashboard with daily totals and per-item breakdown
- Export sales to Excel (.xlsx)
- Reset sales data for trial runs
- Mobile-friendly — works on phones/tablets on the same Wi-Fi

---

## Tech Stack

| Layer    | Tech                                               |
|----------|----------------------------------------------------|
| Backend  | FastAPI, SQLAlchemy 2.0 async, SQLite, aiosqlite, openpyxl |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS 3, Zustand |
| Python   | 3.14+                                              |
| Node     | 18+                                                |

---

## Project Structure

```
stllhaus-pos/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── api/routes/
│   │   │   ├── menu.py              # GET /menu
│   │   │   └── sales.py             # POST /sale, GET /sales, DELETE /sales, GET /sales/export
│   │   ├── db/
│   │   │   ├── models.py            # Sale ORM model
│   │   │   └── session.py           # Async SQLAlchemy engine
│   │   └── schemas/sale.py          # Pydantic schemas
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx             # POS register screen
    │   │   ├── dashboard/           # Sales report page
    │   │   └── api/[...proxy]/      # Next.js proxy → localhost:8000
    │   ├── components/
    │   │   ├── products/            # Menu grid + product cards
    │   │   └── cart/                # Cart items + summary
    │   ├── store/cartStore.ts       # Zustand cart state
    │   └── lib/api.ts               # API client functions
    └── .env.local
```

---

## Getting Started

### 1. Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The SQLite database (`stllhaus.db`) is created automatically on first run.

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev -- --hostname 0.0.0.0
```

### 3. Access

| Device                        | URL                            |
|-------------------------------|--------------------------------|
| This PC                       | http://localhost:3000          |
| Phone / tablet (same Wi-Fi)   | http://\<your-local-ip\>:3000  |

> Find your local IP:  
> `Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" }`

---

## Environment

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=/api
```

All `/api/*` requests are proxied by Next.js to `http://localhost:8000`, so phones on the same network work without needing direct backend access.

---

## Updating the Menu

Edit `backend/app/api/routes/menu.py`. Each item needs:

```python
MenuItem(id="unique-id", name="Item Name", price=5.50, category="Category")
```

Restart the backend after saving.

---

## License

Internal use — STLL Haus.