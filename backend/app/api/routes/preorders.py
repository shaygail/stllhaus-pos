from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm.attributes import flag_modified
from typing import List
from datetime import datetime, timedelta
import pytz

from app.db.session import get_db
from app.db.models import PreOrder, Sale
from app.schemas.preorder import PreOrderCreate, PreOrderStatusUpdate, PreOrderUpdate, PreOrderResponse

router = APIRouter()

# NZ Timezone
NZ_TZ = pytz.timezone('Pacific/Auckland')

VALID_STATUSES = {"pending", "ready", "done"}


@router.get("/preorders", response_model=List[PreOrderResponse])
async def get_preorders(db: AsyncSession = Depends(get_db)):
    """Return all non-done pre-orders ordered by pickup time, then done ones at the end."""
    result = await db.execute(
        select(PreOrder).order_by(PreOrder.pickup_time.asc())
    )
    return result.scalars().all()


@router.post("/preorder", response_model=PreOrderResponse, status_code=201)
async def create_preorder(payload: PreOrderCreate, db: AsyncSession = Depends(get_db)):
    preorder = PreOrder(
        customer_name=payload.customer_name.strip(),
        pickup_time=payload.pickup_time,
        items=[item.model_dump() for item in payload.items],
        notes=payload.notes.strip() if payload.notes else None,
        status="pending",
    )
    db.add(preorder)
    await db.commit()
    await db.refresh(preorder)
    return preorder


@router.patch("/preorder/{preorder_id}/status", response_model=PreOrderResponse)
async def update_preorder_status(
    preorder_id: int,
    payload: PreOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
    result = await db.execute(select(PreOrder).where(PreOrder.id == preorder_id))
    preorder = result.scalar_one_or_none()
    if not preorder:
        raise HTTPException(status_code=404, detail="Pre-order not found")

    # Auto-create a sale when marking as done
    if payload.status == "done" and preorder.status != "done":
        sale_date = datetime.now(NZ_TZ).replace(tzinfo=None)
        day_start = sale_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count_result = await db.execute(
            select(func.count()).select_from(Sale).where(
                Sale.date >= day_start, Sale.date < day_end
            )
        )
        daily_order_number = (count_result.scalar() or 0) + 1
        items = preorder.items if isinstance(preorder.items, list) else []
        subtotal = round(sum(float(i.get("price", 0)) * int(i.get("quantity", 1)) for i in items), 2)
        sale = Sale(
            date=sale_date,
            items=items,
            subtotal=subtotal,
            discount=0.0,
            payment_method=payload.payment_method or "Cash",
            daily_order_number=daily_order_number,
            customer_name=preorder.customer_name,
        )
        db.add(sale)

    preorder.status = payload.status
    await db.commit()
    await db.refresh(preorder)
    return preorder


@router.put("/preorder/{preorder_id}", response_model=PreOrderResponse)
async def update_preorder(
    preorder_id: int,
    payload: PreOrderUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PreOrder).where(PreOrder.id == preorder_id))
    preorder = result.scalar_one_or_none()
    if not preorder:
        raise HTTPException(status_code=404, detail="Pre-order not found")
    preorder.customer_name = payload.customer_name.strip()
    preorder.pickup_time = payload.pickup_time
    preorder.items = [item.model_dump() for item in payload.items]
    preorder.notes = payload.notes.strip() if payload.notes else None
    flag_modified(preorder, "items")
    await db.commit()
    await db.refresh(preorder)
    return preorder


@router.delete("/preorder/{preorder_id}", status_code=200)
async def delete_preorder(preorder_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PreOrder).where(PreOrder.id == preorder_id))
    preorder = result.scalar_one_or_none()
    if not preorder:
        raise HTTPException(status_code=404, detail="Pre-order not found")
    await db.delete(preorder)
    await db.commit()
    return {"message": "Pre-order deleted"}
