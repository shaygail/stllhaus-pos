from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.product import Product
from app.services.product_service import get_products

router = APIRouter()

@router.get("/products", response_model=List[Product])
async def read_products():
    products = await get_products()
    if not products:
        raise HTTPException(status_code=404, detail="Products not found")
    return products