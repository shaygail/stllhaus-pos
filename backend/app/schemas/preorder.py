from pydantic import BaseModel
from datetime import datetime
from typing import List, Any, Optional


class PreOrderItemSchema(BaseModel):
    id: str
    name: str
    price: float
    quantity: int


class PreOrderCreate(BaseModel):
    customer_name: str
    pickup_time: datetime
    items: List[PreOrderItemSchema]
    notes: Optional[str] = None


class PreOrderStatusUpdate(BaseModel):
    status: str  # "pending" | "ready" | "done"
    payment_method: Optional[str] = None  # used when transitioning to "done"


class PreOrderUpdate(BaseModel):
    customer_name: str
    pickup_time: datetime
    items: List[PreOrderItemSchema]
    notes: Optional[str] = None


class PreOrderResponse(BaseModel):
    id: int
    customer_name: str
    pickup_time: datetime
    items: List[Any]
    notes: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
