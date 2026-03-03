from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.types import JSON
from datetime import datetime, timezone
from .session import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    items = Column(JSON, nullable=False)       # list of {id, name, price, quantity}
    subtotal = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)  # "Cash" | "Bank Transfer"