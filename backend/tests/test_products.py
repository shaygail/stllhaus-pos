import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db
from app.db.models import Product
from sqlalchemy.orm import Session

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_session():
    # Assuming you have a function to create a test database session
    session = get_db()
    yield session
    session.close()

def test_get_products(client, db_session):
    response = client.get("/api/products/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_product(client, db_session):
    new_product = {
        "name": "Test Product",
        "price": 5.99
    }
    response = client.post("/api/products/", json=new_product)
    assert response.status_code == 201
    assert response.json()["name"] == new_product["name"]
    assert response.json()["price"] == new_product["price"]

def test_get_product_by_id(client, db_session):
    product = Product(name="Sample Product", price=3.99)
    db_session.add(product)
    db_session.commit()
    response = client.get(f"/api/products/{product.id}")
    assert response.status_code == 200
    assert response.json()["name"] == product.name

def test_update_product(client, db_session):
    product = Product(name="Old Product", price=2.99)
    db_session.add(product)
    db_session.commit()
    updated_product = {
        "name": "Updated Product",
        "price": 4.99
    }
    response = client.put(f"/api/products/{product.id}", json=updated_product)
    assert response.status_code == 200
    assert response.json()["name"] == updated_product["name"]

def test_delete_product(client, db_session):
    product = Product(name="Delete Product", price=1.99)
    db_session.add(product)
    db_session.commit()
    response = client.delete(f"/api/products/{product.id}")
    assert response.status_code == 204
    response = client.get(f"/api/products/{product.id}")
    assert response.status_code == 404