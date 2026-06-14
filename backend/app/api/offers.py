from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.schemas.offer import OfferData, OfferHistoryResponse
import json

router = APIRouter()

# Creazione o aggiornamento offerta
@router.post("/", response_model=OfferData)
def save_offer(offer: OfferData, db: Session = Depends(get_db)):
    # Mock user until auth is fully hooked into Depends
    current_user = "admin" 

    if offer.id:
        db_offer = db.query(models.Offer).filter(models.Offer.id == offer.id).first()
        if not db_offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        # Aggiorna i campi
        db_offer.offer_code = offer.offerCode
        db_offer.customer_name = offer.customerName
        db_offer.project_name = offer.projectName
        db_offer.notes = offer.notes
        
        # Elimina i vecchi items e inserisci i nuovi
        db.query(models.OfferItem).filter(models.OfferItem.offer_id == db_offer.id).delete()
    else:
        # Crea nuova offerta
        db_offer = models.Offer(
            offer_code=offer.offerCode,
            customer_name=offer.customerName,
            project_name=offer.projectName,
            notes=offer.notes,
            created_by=current_user
        )
        db.add(db_offer)
        db.commit()
        db.refresh(db_offer)

    # Inserisci i nuovi item
    for item in offer.items:
        db_item = models.OfferItem(
            offer_id=db_offer.id,
            code=item.code,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unitPrice,
            discount=item.discount
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_offer)
    offer.id = db_offer.id
    return offer

# Recupero storico (Lista)
@router.get("/history", response_model=list[OfferHistoryResponse])
def get_offer_history(db: Session = Depends(get_db)):
    offers = db.query(models.Offer).order_by(models.Offer.created_at.desc()).all()
    return [{
        "id": o.id,
        "offerCode": o.offer_code,
        "customerName": o.customer_name,
        "projectName": o.project_name,
        "createdAt": o.created_at
    } for o in offers]

# Caricamento offerta specifica
@router.get("/{offer_id}", response_model=OfferData)
def get_offer(offer_id: int, db: Session = Depends(get_db)):
    db_offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    items = []
    for item in db_offer.items:
        items.append({
            "id": str(item.id),
            "code": item.code,
            "description": item.description,
            "quantity": item.quantity,
            "unitPrice": item.unit_price,
            "discount": item.discount
        })
        
    return {
        "id": db_offer.id,
        "offerCode": db_offer.offer_code,
        "customerName": db_offer.customer_name,
        "projectName": db_offer.project_name,
        "notes": db_offer.notes,
        "items": items,
        "createdAt": db_offer.created_at
    }

# Export verso tabella di frontiera (CRM)
@router.post("/{offer_id}/export")
def export_offer_to_crm(offer_id: int, db: Session = Depends(get_db)):
    db_offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if not db_offer.offer_code:
         raise HTTPException(status_code=400, detail="Impossibile esportare: Codice Offerta mancante. Compila il campo prima di esportare.")
    
    # Calcolo totale per il CRM
    total = sum([(i.quantity * i.unit_price) * (1 - (i.discount/100)) for i in db_offer.items])
    
    # Prepara payload JSON
    payload = {
        "offerCode": db_offer.offer_code,
        "customerName": db_offer.customer_name,
        "projectName": db_offer.project_name,
        "totalAmount": total,
        "items": [{"code": i.code, "qty": i.quantity, "price": i.unit_price} for i in db_offer.items]
    }
    
    # Salva nella tabella di frontiera
    frontier_record = models.CrmFrontier(
        offer_code=db_offer.offer_code,
        customer_name=db_offer.customer_name,
        total_amount=total,
        payload_json=json.dumps(payload)
    )
    
    db.add(frontier_record)
    db.commit()
    
    return {"message": "Offerta esportata con successo nel CRM (Tabella Frontiera).", "status": "success"}
