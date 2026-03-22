from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class InventoryCreate(BaseModel):
    name: str
    category: str
    quantity: float
    unit: str
    cost_per_unit: Optional[float] = None
    date_purchased: Optional[datetime] = None
    notes: Optional[str] = None
    log_as_expense: bool = True  # auto-create an Expense record for the total cost
    paid_from: str = "sales"  # "sales" | "own" — used when log_as_expense is True


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    cost_per_unit: Optional[float] = None
    date_purchased: Optional[datetime] = None
    notes: Optional[str] = None


class InventoryResponse(BaseModel):
    id: int
    name: str
    category: str
    quantity: float
    unit: str
    cost_per_unit: Optional[float] = None
    date_purchased: datetime
    notes: Optional[str] = None

    model_config = {"from_attributes": True}
