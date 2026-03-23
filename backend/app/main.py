from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete as sql_delete, select, func, text

from app.db.session import engine, Base, get_db
from app.db.models import Sale, MenuItemDB, Tab, InventoryItem, StockLog
from app.api.routes import menu, sales, preorders, expenses, funds, tabs, inventory

DEFAULT_MENU = [
    {"name": "Matcha Latte",         "price": 3.50, "category": "Matcha Series"},
    {"name": "Strawberry Matcha",    "price": 4.00, "category": "Matcha Series"},
    {"name": "Ube Cream Matcha",     "price": 3.50, "category": "Matcha Series"},
    {"name": "Ube Cream Cold Brew",  "price": 4.50, "category": "Cold Brew Series"},
    {"name": "Black Pearl Cold Brew","price": 4.50, "category": "Cold Brew Series"},
    {"name": "Cold Brew",            "price": 5.00, "category": "Cold Brew Series"},
    {"name": "Twilight Cloud",       "price": 5.50, "category": "Cloud Series"},
    {"name": "Black Pearl Cloud",    "price": 5.50, "category": "Cloud Series"},
    {"name": "Almond Milk",          "price": 1.00, "category": "Add Ons"},
    {"name": "Regular Milk",         "price": 0.50, "category": "Add Ons"},
    {"name": "Earl Grey Syrup",      "price": 0.50, "category": "Add Ons"},
    {"name": "Ube Syrup",            "price": 0.50, "category": "Add Ons"},
    {"name": "Strawberry Syrup",     "price": 0.50, "category": "Add Ons"},
    {"name": "Black Pearl Syrup",    "price": 0.50, "category": "Add Ons"},
    {"name": "Tall",                 "price": 0.00, "category": "Sizes"},
    {"name": "Grande",               "price": 0.50, "category": "Sizes"},
    {"name": "Venti",                "price": 1.00, "category": "Sizes"},
]


async def ensure_menu_availability_columns() -> None:
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'menu_items'
        """))
        existing_columns = {row[0] for row in result.fetchall()}
        if "is_hidden" not in existing_columns:
            await conn.execute(text("ALTER TABLE menu_items ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE"))
        if "is_sold_out" not in existing_columns:
            await conn.execute(text("ALTER TABLE menu_items ADD COLUMN is_sold_out BOOLEAN NOT NULL DEFAULT FALSE"))


async def ensure_sales_columns() -> None:
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'sales'
        """))
        existing_columns = {row[0] for row in result.fetchall()}
        if "daily_order_number" not in existing_columns:
            await conn.execute(text("ALTER TABLE sales ADD COLUMN daily_order_number INTEGER"))
        if "customer_name" not in existing_columns:
            await conn.execute(text("ALTER TABLE sales ADD COLUMN customer_name TEXT"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_menu_availability_columns()
    await ensure_sales_columns()
    async for db in get_db():
        count_result = await db.execute(select(func.count()).select_from(MenuItemDB))
        if count_result.scalar() == 0:
            db.add_all([MenuItemDB(**item) for item in DEFAULT_MENU])
            await db.commit()
        cutoff = datetime.utcnow() - timedelta(days=365)
        await db.execute(sql_delete(Sale).where(Sale.date < cutoff))
        await db.commit()
        break
    yield


app = FastAPI(title="STLL Haus POS", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu.router, tags=["Menu"])
app.include_router(sales.router, tags=["Sales"])
app.include_router(preorders.router, tags=["Pre-Orders"])
app.include_router(expenses.router, tags=["Expenses"])
app.include_router(funds.router, tags=["Funds"])
app.include_router(tabs.router, tags=["Tabs"])
app.include_router(inventory.router, tags=["Inventory"])


@app.get("/")
async def root():
    return {"message": "STLL Haus POS API is running"}
