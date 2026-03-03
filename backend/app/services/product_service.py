from sqlalchemy.orm import Session
from app.db.models import Product
from app.schemas.product import ProductCreate, ProductUpdate

class ProductService:
    def __init__(self, db: Session):
        self.db = db

    def get_product(self, product_id: int) -> Product:
        return self.db.query(Product).filter(Product.id == product_id).first()

    def get_all_products(self) -> list[Product]:
        return self.db.query(Product).all()

    def create_product(self, product: ProductCreate) -> Product:
        db_product = Product(**product.dict())
        self.db.add(db_product)
        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def update_product(self, product_id: int, product: ProductUpdate) -> Product:
        db_product = self.get_product(product_id)
        if db_product:
            for key, value in product.dict(exclude_unset=True).items():
                setattr(db_product, key, value)
            self.db.commit()
            self.db.refresh(db_product)
        return db_product

    def delete_product(self, product_id: int) -> bool:
        db_product = self.get_product(product_id)
        if db_product:
            self.db.delete(db_product)
            self.db.commit()
            return True
        return False