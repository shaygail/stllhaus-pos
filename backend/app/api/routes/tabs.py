from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import pytz

from app.db.session import get_db
from app.db.models import Tab
from app.schemas.tab import TabCreate, TabResponse

router = APIRouter()

# NZ Timezone
NZ_TZ = pytz.timezone('Pacific/Auckland')


@router.get("/tabs", response_model=List[TabResponse])
async def get_tabs(db: AsyncSession = Depends(get_db)):
    """Return all tabs, open ones first, then newest settled."""
    result = await db.execute(
        select(Tab).order_by(
            Tab.status.asc(),   # "open" sorts before "settled"
            Tab.date.desc()
        )
    )
    return result.scalars().all()


@router.post("/tab", response_model=TabResponse, status_code=201)
async def create_tab(payload: TabCreate, db: AsyncSession = Depends(get_db)):
    """Open a new tab for a customer."""
    tab = Tab(
        customer_name=payload.customer_name.strip(),
        amount=round(payload.amount, 2),
        direction=payload.direction,
        description=payload.description.strip() if payload.description else None,
    )
    db.add(tab)
    await db.commit()
    await db.refresh(tab)
    return tab


@router.patch("/tab/{tab_id}/settle", response_model=TabResponse)
async def settle_tab(tab_id: int, db: AsyncSession = Depends(get_db)):
    """Mark a tab as settled (paid)."""
    result = await db.execute(select(Tab).where(Tab.id == tab_id))
    tab = result.scalar_one_or_none()
    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")
    tab.status = "settled"
    tab.settled_at = datetime.now(NZ_TZ).replace(tzinfo=None)
    await db.commit()
    await db.refresh(tab)
    return tab


@router.patch("/tab/{tab_id}/reopen", response_model=TabResponse)
async def reopen_tab(tab_id: int, db: AsyncSession = Depends(get_db)):
    """Reopen a tab that was settled by mistake."""
    result = await db.execute(select(Tab).where(Tab.id == tab_id))
    tab = result.scalar_one_or_none()
    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")
    tab.status = "open"
    tab.settled_at = None
    await db.commit()
    await db.refresh(tab)
    return tab


@router.delete("/tab/{tab_id}", status_code=200)
async def delete_tab(tab_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a tab permanently."""
    result = await db.execute(select(Tab).where(Tab.id == tab_id))
    tab = result.scalar_one_or_none()
    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")
    await db.delete(tab)
    await db.commit()
    return {"ok": True}
