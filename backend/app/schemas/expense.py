from pydantic import BaseModel
from datetime import datetime
from typing import Optional

VALID_CATEGORIES = {"Ingredients", "Packaging", "Equipment", "Other"}


VALID_PAID_FROM = {"sales", "own"}


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: str
    date: Optional[datetime] = None
    paid_from: str = "sales"  # "sales" | "own"


class ExpenseResponse(BaseModel):
    id: int
    date: datetime
    amount: float
    category: str
    description: str
    paid_from: Optional[str] = None

    model_config = {"from_attributes": True}
