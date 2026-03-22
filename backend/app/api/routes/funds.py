from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.db.session import get_db
from app.db.models import BalanceEntry
from app.schemas.balance import BalanceEntryCreate, BalanceEntryResponse, BalanceSummary

router = APIRouter()


@router.get("/balance", response_model=BalanceSummary)
async def get_balance(db: AsyncSession = Depends(get_db)):
    """Return current cash and bank totals (sum of all entries)."""
    cash_result = await db.execute(
        select(func.coalesce(func.sum(BalanceEntry.amount), 0.0))
        .where(BalanceEntry.account == "cash")
    )
    bank_result = await db.execute(
        select(func.coalesce(func.sum(BalanceEntry.amount), 0.0))
        .where(BalanceEntry.account == "bank")
    )
    return BalanceSummary(cash=cash_result.scalar(), bank=bank_result.scalar())


@router.get("/balance/entries", response_model=List[BalanceEntryResponse])
async def get_balance_entries(db: AsyncSession = Depends(get_db)):
    """Return all balance entries, newest first."""
    result = await db.execute(
        select(BalanceEntry).order_by(BalanceEntry.date.desc())
    )
    return result.scalars().all()


@router.post("/balance/entry", response_model=BalanceEntryResponse, status_code=201)
async def add_balance_entry(payload: BalanceEntryCreate, db: AsyncSession = Depends(get_db)):
    entry = BalanceEntry(
        account=payload.account,
        amount=payload.amount,
        description=payload.description.strip() if payload.description else None,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/balance/entry/{entry_id}", status_code=200)
async def delete_balance_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BalanceEntry).where(BalanceEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.delete(entry)
    await db.commit()
    return {"ok": True}
