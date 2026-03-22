from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.db.models import MenuItemDB
from app.schemas.menu import MenuItemCreate, MenuItemUpdate, MenuItemResponse

router = APIRouter()


def to_response(item: MenuItemDB) -> MenuItemResponse:
    return MenuItemResponse(
        id=str(item.id),
        name=item.name,
        price=item.price,
        category=item.category,
        is_hidden=bool(item.is_hidden),
        is_sold_out=bool(item.is_sold_out),
    )


@router.get("/menu", response_model=List[MenuItemResponse])
async def get_menu(include_unavailable: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(MenuItemDB)
    if not include_unavailable:
        query = query.where(MenuItemDB.is_hidden.is_(False), MenuItemDB.is_sold_out.is_(False))
    result = await db.execute(query.order_by(MenuItemDB.category, MenuItemDB.name))
    return [to_response(i) for i in result.scalars().all()]


@router.post("/menu", response_model=MenuItemResponse, status_code=201)
async def create_menu_item(payload: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    item = MenuItemDB(
        name=payload.name.strip(),
        price=round(payload.price, 2),
        category=payload.category.strip(),
        is_hidden=payload.is_hidden,
        is_sold_out=payload.is_sold_out,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return to_response(item)


@router.put("/menu/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(item_id: int, payload: MenuItemUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItemDB).where(MenuItemDB.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    item.name = payload.name.strip()
    item.price = round(payload.price, 2)
    item.category = payload.category.strip()
    item.is_hidden = payload.is_hidden
    item.is_sold_out = payload.is_sold_out
    await db.commit()
    await db.refresh(item)
    return to_response(item)


@router.delete("/menu/{item_id}", status_code=200)
async def delete_menu_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItemDB).where(MenuItemDB.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Item deleted"}