from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, index=True)
    list_price = Column(Float, nullable=False)
    currency = Column(String, default="EUR")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    industry = Column(String)
    country = Column(String)

class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    offer_code = Column(String, unique=True, index=True, nullable=True)
    customer_name = Column(String, nullable=False)
    project_name = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, nullable=False) # L'utente che l'ha creata
    
    items = relationship("OfferItem", back_populates="offer", cascade="all, delete-orphan")

class OfferItem(Base):
    __tablename__ = "offer_items"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id"))
    code = Column(String, nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    
    offer = relationship("Offer", back_populates="items")

# Tabella di frontiera per il CRM
class CrmFrontier(Base):
    __tablename__ = "crm_frontier"
    
    id = Column(Integer, primary_key=True, index=True)
    offer_code = Column(String, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    export_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="PENDING") # PENDING, PROCESSED
    payload_json = Column(Text, nullable=False) # Intero payload in JSON per facilitare il CRM

