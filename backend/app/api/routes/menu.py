from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

router = APIRouter()


class MenuItem(BaseModel):
    id: str
    name: str
    price: float
    category: str


# Placeholder menu — replace with actual STLL Haus items when ready
MENU_ITEMS: List[MenuItem] = [
    # Hot Coffee
    MenuItem(id="esp",   name="Espresso",      price=3.50, category="Hot Coffee"),
    MenuItem(id="dbl",   name="Double Shot",   price=4.00, category="Hot Coffee"),
    MenuItem(id="long",  name="Long Black",    price=3.50, category="Hot Coffee"),
    MenuItem(id="moc",   name="Mocha",         price=5.00, category="Hot Coffee"),
    # Hot Drinks
    MenuItem(id="hmc",   name="Hot Choc",      price=4.50, category="Hot Drinks"),
    MenuItem(id="chai",  name="Chai Latte",    price=4.50, category="Hot Drinks"),
    MenuItem(id="mtch",  name="Matcha Latte",  price=5.00, category="Hot Drinks"),
    # Cold Drinks
    MenuItem(id="cbrew", name="Cold Brew",      price=5.50, category="Cold Drinks"),
    MenuItem(id="icmtch",name="Matcha Latte",   price=5.50, category="Cold Drinks"),
    MenuItem(id="egm",   name="Earl Grey Matcha",     price=5.00, category="Cold Drinks"),
    MenuItem(id="ucf",   name="Ube Cream Matcha",     price=5.50, category="Cold Drinks"),
    # Food
    # MenuItem(id="muf",   name="Muffin",        price=4.00, category="Food"),
    # MenuItem(id="cros",  name="Croissant",     price=5.00, category="Food"),
]


@router.get("/menu", response_model=List[MenuItem])
async def get_menu():
    """Returns all available menu items."""
    return MENU_ITEMS