from pydantic import BaseModel
from datetime import datetime
from typing import List, Any, Optional


class CartItemSchema(BaseModel):
    id: str
    name: str
    price: float
    quantity: int


class SaleCreate(BaseModel):
    items: List[CartItemSchema] = []
    subtotal: float
    discount: float = 0.0  # discount amount deducted from subtotal
    payment_method: str  # "Cash" | "Bank Transfer"
    customer_name: Optional[str] = None
    date: Optional[datetime] = None  # if provided, use this date (for manual/past entries)
    description: Optional[str] = None  # free-text label for manual entries


class SaleUpdate(BaseModel):
    date: datetime
    subtotal: float
    discount: float = 0.0
    payment_method: str
    customer_name: Optional[str] = None
    description: Optional[str] = None  # replaces items display name for manual entries


class SaleResponse(BaseModel):
    id: int
    date: datetime
    items: List[Any]
    subtotal: float
    discount: float = 0.0
    payment_method: str
    daily_order_number: Optional[int] = None
    customer_name: Optional[str] = None

    model_config = {"from_attributes": True}
