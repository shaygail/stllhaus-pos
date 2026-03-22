from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional

VALID_ACCOUNTS = {"cash", "bank"}


class BalanceEntryCreate(BaseModel):
    account: str          # "cash" | "bank"
    amount: float         # positive = add, negative = subtract
    description: Optional[str] = None

    @field_validator("account")
    @classmethod
    def validate_account(cls, v: str) -> str:
        if v not in VALID_ACCOUNTS:
            raise ValueError(f"account must be one of: {VALID_ACCOUNTS}")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v == 0:
            raise ValueError("amount must not be zero")
        return v


class BalanceEntryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    date: datetime
    account: str
    amount: float
    description: Optional[str]


class BalanceSummary(BaseModel):
    cash: float
    bank: float
