from fastapi.testclient import TestClient
from app.main import app
from app.schemas.order import OrderCreate
from app.services.order_service import create_order

client = TestClient(app)

def test_create_order():
    order_data = {
        "items": [{"product_id": 1, "quantity": 2}],
        "subtotal": 20.00,
        "payment_method": "cash"
    }
    response = client.post("/orders/", json=order_data)
    assert response.status_code == 201
    assert response.json()["subtotal"] == 20.00

def test_get_orders():
    response = client.get("/orders/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)  # Ensure the response is a list
    assert len(response.json()) > 0  # Ensure there are orders returned

def test_create_order_invalid_data():
    invalid_order_data = {
        "items": [{"product_id": 1, "quantity": -1}],  # Invalid quantity
        "subtotal": 20.00,
        "payment_method": "cash"
    }
    response = client.post("/orders/", json=invalid_order_data)
    assert response.status_code == 422  # Unprocessable Entity for validation errors