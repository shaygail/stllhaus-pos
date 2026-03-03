from pydantic import BaseModel
from typing import List

class Product(BaseModel):
    id: int
    name: str
    price: float

class ProductCreate(BaseModel):
    name: str
    price: float

class ProductUpdate(BaseModel):
    name: str | None = None
    price: float | None = None

class ProductResponse(BaseModel):
    id: int
    name: str
    price: float

    class Config:
        orm_mode = True

class ProductListResponse(BaseModel):
    products: List[ProductResponse]