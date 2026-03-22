from pydantic import BaseModel


class MenuItemCreate(BaseModel):
    name: str
    price: float
    category: str
    is_hidden: bool = False
    is_sold_out: bool = False


class MenuItemUpdate(BaseModel):
    name: str
    price: float
    category: str
    is_hidden: bool = False
    is_sold_out: bool = False


class MenuItemResponse(BaseModel):
    id: str
    name: str
    price: float
    category: str
    is_hidden: bool
    is_sold_out: bool
