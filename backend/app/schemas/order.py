from pydantic import BaseModel
from typing import List, Optional

class OrderItem(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(BaseModel):
    items: List[OrderItem]
    subtotal: float
    payment_method: str

class Order(OrderCreate):
    id: int
    date: str  # You can use datetime instead of str if you want to handle date objects

    class Config:
        orm_mode = True