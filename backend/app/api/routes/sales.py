from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone
import io

from app.db.session import get_db
from app.db.models import Sale
from app.schemas.sale import SaleCreate, SaleResponse

router = APIRouter()


@router.post("/sale", response_model=SaleResponse, status_code=201)
async def create_sale(payload: SaleCreate, db: AsyncSession = Depends(get_db)):
    """Record a completed sale."""
    sale = Sale(
        date=datetime.now(timezone.utc),
        items=[item.model_dump() for item in payload.items],
        subtotal=round(payload.subtotal, 2),
        payment_method=payload.payment_method,
    )
    db.add(sale)
    await db.commit()
    await db.refresh(sale)
    return sale


@router.get("/sales", response_model=List[SaleResponse])
async def get_sales(db: AsyncSession = Depends(get_db)):
    """Return all sales, newest first."""
    result = await db.execute(select(Sale).order_by(Sale.date.desc()))
    return result.scalars().all()


@router.get("/sales/export")
async def export_sales(db: AsyncSession = Depends(get_db)):
    """Export all sales to an Excel file (.xlsx)."""
    try:
        import openpyxl
    except ImportError:
        raise HTTPException(status_code=500, detail="openpyxl is not installed")

    result = await db.execute(select(Sale).order_by(Sale.date.asc()))
    sales = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sales"

    # Header row
    ws.append(["ID", "Date", "Items", "Subtotal (NZD)", "Payment Method"])

    for sale in sales:
        items_str = ", ".join(
            f"{item['name']} ×{item['quantity']}" for item in (sale.items or [])
        )
        ws.append([
            sale.id,
            sale.date.strftime("%Y-%m-%d %H:%M:%S") if sale.date else "",
            items_str,
            round(sale.subtotal, 2),
            sale.payment_method,
        ])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = f"stllhaus_sales_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.delete("/sales", status_code=200)
async def reset_sales(db: AsyncSession = Depends(get_db)):
    """Delete ALL sales records — use for trial/testing resets only."""
    from sqlalchemy import delete
    await db.execute(delete(Sale))
    await db.commit()
    return {"message": "All sales deleted"}
