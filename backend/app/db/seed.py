from sqlalchemy.orm import Session
from app.db import models

def seed_db(db: Session):
    # Se il DB ha già dati, skippiamo
    if db.query(models.Product).first():
        return

    # Mock Data: Prodotti Ceramici
    products = [
        models.Product(code="FR-400", name="Forno a Rulli 400mm", description="Modulo base per forno a rulli, larghezza canale 400mm, temperatura max 1200C", category="Forni", list_price=45000.0),
        models.Product(code="MOT-480", name="Motore Elettrico 480V 60Hz", description="Motore ad alta efficienza per mercato Nord America", category="Componenti", list_price=1200.0),
        models.Product(code="MOT-400", name="Motore Elettrico 400V 50Hz", description="Motore standard mercato EU", category="Componenti", list_price=950.0),
        models.Product(code="PR-2000T", name="Pressa Idraulica 2000 Ton", description="Pressa ad alto tonnellaggio per grandi formati", category="Presse", list_price=125000.0),
        models.Product(code="SRV-INST", name="Servizio Installazione", description="Giornata uomo per installazione e collaudo", category="Servizi", list_price=850.0),
    ]

    # Mock Data: Clienti
    customers = [
        models.Customer(company_name="Ceramica Rossi SpA", industry="Piastrelle", country="Italia"),
        models.Customer(company_name="Texas Tiles Inc", industry="Piastrelle", country="USA"),
    ]

    db.add_all(products)
    db.add_all(customers)
    db.commit()
