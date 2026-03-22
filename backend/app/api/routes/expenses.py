from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, timedelta
import pytz

# NZ Timezone
NZ_TZ = pytz.timezone('Pacific/Auckland')

from app.db.session import get_db
from app.db.models import Expense
from app.schemas.expense import ExpenseCreate, ExpenseResponse, VALID_CATEGORIES

router = APIRouter()


@router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Return expenses newest-first. Optionally filter by date."""
    query = select(Expense).order_by(Expense.date.desc())
    if date:
        try:
            d = datetime.strptime(date, "%Y-%m-%d")
            query = query.where(Expense.date >= d).where(Expense.date < d + timedelta(days=1))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/expense", response_model=ExpenseResponse, status_code=201)
async def create_expense(payload: ExpenseCreate, db: AsyncSession = Depends(get_db)):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {VALID_CATEGORIES}")
    expense = Expense(
        date=payload.date if payload.date else datetime.now(NZ_TZ).replace(tzinfo=None),
        amount=round(payload.amount, 2),
        category=payload.category,
        description=payload.description.strip(),
        paid_from=payload.paid_from if payload.paid_from in {"sales", "own"} else "sales",
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.put("/expense/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: int, payload: ExpenseCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {VALID_CATEGORIES}")
    expense.amount = round(payload.amount, 2)
    expense.category = payload.category
    expense.description = payload.description.strip()
    expense.paid_from = payload.paid_from if payload.paid_from in {"sales", "own"} else "sales"
    if payload.date:
        expense.date = payload.date
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/expense/{expense_id}", status_code=200)
async def delete_expense(expense_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(expense)
    await db.commit()
    return {"message": "Expense deleted"}
