from pydantic import BaseModel
from datetime import datetime
from typing import List, Any


class CartItemSchema(BaseModel):
    id: str
    name: str
    price: float
    quantity: int


class SaleCreate(BaseModel):
    items: List[CartItemSchema]
    subtotal: float
    payment_method: str  # "Cash" | "Bank Transfer"


class SaleResponse(BaseModel):
    id: int
    date: datetime
    items: List[Any]
    subtotal: float
    payment_method: str

    model_config = {"from_attributes": True}
