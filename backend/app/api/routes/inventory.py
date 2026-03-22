from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timedelta
import pytz
from pydantic import BaseModel

# NZ Timezone
NZ_TZ = pytz.timezone('Pacific/Auckland')

from app.db.session import get_db
from app.db.models import InventoryItem, Expense, StockLog
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse


class StockLogResponse(BaseModel):
    id: int
    date: datetime
    item_id: Optional[int] = None
    item_name: str
    category: Optional[str] = None
    action: str
    delta: float
    quantity_after: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    model_config = {"from_attributes": True}

router = APIRouter()

# Map inventory categories to expense categories
_CAT_MAP = {
    "Dairy": "Ingredients",
    "Coffee": "Ingredients",
    "Syrups & Flavours": "Ingredients",
    "Packaging": "Packaging",
    "Equipment": "Equipment",
    "Cleaning": "Other",
    "Other": "Other",
}


@router.get("/inventory", response_model=List[InventoryResponse])
async def get_inventory(db: AsyncSession = Depends(get_db)):
    """Return all inventory items, newest first."""
    result = await db.execute(select(InventoryItem).order_by(InventoryItem.date_purchased.desc()))
    return result.scalars().all()


@router.post("/inventory", response_model=InventoryResponse, status_code=201)
async def create_inventory_item(payload: InventoryCreate, db: AsyncSession = Depends(get_db)):
    """Add stock. If an item with the same name already exists, adds qty to it (upsert)."""
    name_clean = payload.name.strip()

    # Check for existing item with same name (case-insensitive)
    existing_result = await db.execute(
        select(InventoryItem).where(func.lower(InventoryItem.name) == name_clean.lower())
    )
    item = existing_result.scalar_one_or_none()

    if item:
        # ── Upsert: add quantity to existing item ─────────────────────────────
        item.quantity = round(item.quantity + payload.quantity, 4)
        # Update optional fields if provided
        if payload.cost_per_unit is not None:
            item.cost_per_unit = payload.cost_per_unit
        if payload.notes and payload.notes.strip():
            item.notes = payload.notes.strip()
        if payload.date_purchased:
            item.date_purchased = payload.date_purchased
        expense_qty = payload.quantity  # only log the new qty as expense
    else:
        # ── Create new item ───────────────────────────────────────────────────
        item = InventoryItem(
            name=name_clean,
            category=payload.category.strip(),
            quantity=payload.quantity,
            unit=payload.unit.strip(),
            cost_per_unit=payload.cost_per_unit,
            date_purchased=payload.date_purchased if payload.date_purchased else datetime.now(NZ_TZ).replace(tzinfo=None),
            notes=payload.notes.strip() if payload.notes else None,
        )
        db.add(item)
        expense_qty = payload.quantity

    # Auto-create expense for the restocked quantity
    if payload.log_as_expense and payload.cost_per_unit and payload.cost_per_unit > 0:
        total_cost = round(payload.cost_per_unit * expense_qty, 2)
        item_category = item.category if item.category else payload.category.strip()
        expense_category = _CAT_MAP.get(item_category, "Ingredients")
        expense_desc = f"{expense_qty} {payload.unit.strip()} of {name_clean}"
        if payload.notes and payload.notes.strip():
            expense_desc += f" ({payload.notes.strip()})"
        expense = Expense(
            amount=total_cost,
            category=expense_category,
            description=expense_desc,
            date=payload.date_purchased if payload.date_purchased else datetime.now(NZ_TZ).replace(tzinfo=None),
            paid_from=payload.paid_from if payload.paid_from in {"sales", "own"} else "sales",
        )
        db.add(expense)

    await db.commit()
    await db.refresh(item)
    return item


@router.put("/inventory/{item_id}", response_model=InventoryResponse)
async def update_inventory_item(
    item_id: int,
    payload: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing inventory item."""
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if payload.name is not None:
        item.name = payload.name.strip()
    if payload.category is not None:
        item.category = payload.category.strip()
    if payload.quantity is not None:
        item.quantity = payload.quantity
    if payload.unit is not None:
        item.unit = payload.unit.strip()
    if payload.cost_per_unit is not None:
        item.cost_per_unit = payload.cost_per_unit
    if payload.date_purchased is not None:
        item.date_purchased = payload.date_purchased
    if payload.notes is not None:
        item.notes = payload.notes.strip() or None

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/inventory/{item_id}", status_code=200)
async def delete_inventory_item(item_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an inventory entry."""
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    # Log deletion before removing the record
    db.add(StockLog(
        item_id=item.id,
        item_name=item.name,
        category=item.category,
        action="deleted",
        delta=-item.quantity,
        quantity_after=0.0,
        unit=item.unit,
    ))
    await db.delete(item)
    await db.commit()
    return {"ok": True}


class AdjustPayload(BaseModel):
    delta: float
    restock_date: Optional[str] = None  # ISO date string, only used when delta > 0


@router.patch("/inventory/{item_id}/adjust", response_model=InventoryResponse)
async def adjust_inventory_item(item_id: int, payload: AdjustPayload, db: AsyncSession = Depends(get_db)):
    """Add or subtract from current stock quantity (positive = restock, negative = use)."""
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    new_qty = round(item.quantity + payload.delta, 4)
    if new_qty < 0:
        raise HTTPException(status_code=400, detail=f"Cannot go below zero (current stock: {item.quantity} {item.unit})")
    item.quantity = new_qty
    # Update date_purchased to the restock date when restocking
    if payload.delta > 0 and payload.restock_date:
        try:
            item.date_purchased = datetime.strptime(payload.restock_date, "%Y-%m-%d")
        except ValueError:
            pass
    # Log the adjustment
    action = "restocked" if payload.delta > 0 else "used"
    db.add(StockLog(
        item_id=item.id,
        item_name=item.name,
        category=item.category,
        action=action,
        delta=payload.delta,
        quantity_after=new_qty,
        unit=item.unit,
    ))
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/inventory/history", response_model=List[StockLogResponse])
async def get_stock_history(
    item_id: Optional[int] = Query(None, description="Filter by specific item ID"),
    db: AsyncSession = Depends(get_db),
):
    """Return stock change history, newest first."""
    query = select(StockLog).order_by(StockLog.date.desc())
    if item_id is not None:
        query = query.where(StockLog.item_id == item_id)
    result = await db.execute(query)
    return result.scalars().all()
