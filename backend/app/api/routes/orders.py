from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.order import OrderCreate, OrderResponse
from app.services.order_service import create_order, get_orders

router = APIRouter()

@router.post("/orders/", response_model=OrderResponse)
def add_order(order: OrderCreate, db: Session = Depends(get_db)):
    try:
        return create_order(db=db, order=order)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/orders/", response_model=list[OrderResponse])
def read_orders(db: Session = Depends(get_db)):
    return get_orders(db=db)