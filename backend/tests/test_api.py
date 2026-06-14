import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base, get_db

# Setup un DB in memory per i test con StaticPool per preservare i dati tra le sessioni
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Crea le tabelle nel DB di test
from app.db import models
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def client():
    # Inseriamo dei dati dummy nel db in memory
    db = TestingSessionLocal()
    test_product = models.Product(code="TEST-01", name="Forno Test", list_price=100.0)
    db.add(test_product)
    db.commit()
    db.close()
    
    with TestClient(app) as c:
        yield c

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome to AI Sales Assistant API" in response.json()["message"]

def test_get_products(client):
    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    # Check if our test product is in the result
    assert any(p["code"] == "TEST-01" for p in data)

def test_chat_endpoint_mock(client, monkeypatch):
    # Mockiamo la chiamata all'LLM per evitare di fare richieste API reali durante i test
    def mock_generate_chat_response(message, context):
        return {
            "text": "Ecco la tua offerta",
            "offer": {"customerName": "Test", "projectName": "Test", "notes": "", "items": []}
        }
    
    import app.main
    monkeypatch.setattr(app.main, "generate_chat_response", mock_generate_chat_response)
    
    response = client.post("/api/chat", json={"message": "Fammi un'offerta per Test"})
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "success"
    assert data["reply"] == "Ecco la tua offerta"
    assert data["offer"] is not None
    assert data["offer"]["customerName"] == "Test"
