from sqlalchemy.orm import Session
from app.db.models import Sales
from app.schemas.order import OrderCreate, OrderResponse

class OrderService:
    def __init__(self, db: Session):
        self.db = db

    def create_order(self, order: OrderCreate) -> OrderResponse:
        sale = Sales(
            items=order.items,
            subtotal=order.subtotal,
            payment_method=order.payment_method
        )
        self.db.add(sale)
        self.db.commit()
        self.db.refresh(sale)
        return OrderResponse.from_orm(sale)

    def get_orders(self) -> list[OrderResponse]:
        sales = self.db.query(Sales).all()
        return [OrderResponse.from_orm(sale) for sale in sales]