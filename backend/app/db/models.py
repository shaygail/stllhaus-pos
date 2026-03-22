from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.types import JSON
from datetime import datetime
from .session import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(DateTime, default=lambda: datetime.now())
    items = Column(JSON, nullable=False)       # list of {id, name, price, quantity}
    subtotal = Column(Float, nullable=False)   # items total BEFORE discount
    discount = Column(Float, nullable=False, default=0.0)  # discount deducted
    payment_method = Column(String, nullable=False)  # "Cash" | "Bank Transfer"
    daily_order_number = Column(Integer, nullable=True)  # resets each day: #1, #2, #3…
    customer_name = Column(String, nullable=True)  # optional name on the order


class MenuItemDB(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    is_hidden = Column(Boolean, nullable=False, default=False)
    is_sold_out = Column(Boolean, nullable=False, default=False)


class PreOrder(Base):
    __tablename__ = "preorders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_name = Column(String, nullable=False)
    pickup_time = Column(DateTime, nullable=False)
    items = Column(JSON, nullable=False)  # [{id, name, price, quantity}]
    notes = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending | ready | done
    created_at = Column(DateTime, default=lambda: datetime.now())


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(DateTime, default=lambda: datetime.now())
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # Ingredients | Packaging | Equipment | Other
    description = Column(String, nullable=False)
    paid_from = Column(String, nullable=True, default="sales")  # "sales" | "own"


class BalanceEntry(Base):
    __tablename__ = "balance_entries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(DateTime, default=lambda: datetime.now())
    account = Column(String, nullable=False)   # "cash" | "bank"
    amount = Column(Float, nullable=False)     # positive = add, negative = subtract
    description = Column(String, nullable=True)


class Tab(Base):
    __tablename__ = "tabs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    direction = Column(String, nullable=False)  # "they_owe" | "i_owe"
    description = Column(String, nullable=True)
    date = Column(DateTime, default=lambda: datetime.now())
    status = Column(String, nullable=False, default="open")  # "open" | "settled"
    settled_at = Column(DateTime, nullable=True)


class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)             # e.g. "Oat Milk"
    category = Column(String, nullable=False)         # e.g. "Dairy", "Coffee", "Packaging"
    quantity = Column(Float, nullable=False)          # e.g. 6
    unit = Column(String, nullable=False)             # e.g. "cartons", "kg", "L", "pcs"
    cost_per_unit = Column(Float, nullable=True)      # optional, price paid per unit
    date_purchased = Column(DateTime, default=lambda: datetime.now())
    notes = Column(String, nullable=True)


class StockLog(Base):
    __tablename__ = "stock_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(DateTime, default=lambda: datetime.now())
    item_id = Column(Integer, nullable=True)       # nullable — item may be deleted later
    item_name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    action = Column(String, nullable=False)        # "added" | "restocked" | "used" | "deleted"
    delta = Column(Float, nullable=False)          # positive = stock in, negative = stock out
    quantity_after = Column(Float, nullable=True)  # stock level after the event
    unit = Column(String, nullable=True)
    notes = Column(String, nullable=True)