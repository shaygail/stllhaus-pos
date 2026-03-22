from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TabCreate(BaseModel):
    customer_name: str
    amount: float
    direction: str  # "they_owe" | "i_owe"
    description: Optional[str] = None


class TabResponse(BaseModel):
    id: int
    customer_name: str
    amount: float
    direction: str
    description: Optional[str]
    date: datetime
    status: str
    settled_at: Optional[datetime]

    model_config = {"from_attributes": True}
