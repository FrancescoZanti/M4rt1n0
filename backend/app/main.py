from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.services.llm_service import generate_chat_response
from app.db.database import engine, Base, get_db
from app.db import models, seed
from app.api import auth, offers

# Crea le tabelle nel DB all'avvio
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Sales Assistant API",
    description="API for the AI Sales Assistant for the Ceramic Industry",
    version="1.0.0",
)

# Includi i router
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(offers.router, prefix="/api/offers", tags=["offers"])

# Eseguiamo il seed del DB all'avvio
@app.on_event("startup")
def on_startup():
    db = next(get_db())
    seed.seed_db(db)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    context: dict | None = None

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Sales Assistant API"}

@app.get("/api/products")
def get_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    return products

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    # Per ora recuperiamo i prodotti dal DB per passarli al contesto dell'LLM (RAG molto basico)
    products = db.query(models.Product).all()
    product_catalog = "\n".join([f"- {p.code}: {p.name} (Listino: {p.list_price} EUR)" for p in products])
    
    enriched_context = f"Catalogo Prodotti Attuale:\n{product_catalog}"
    
    # Passiamo il messaggio all'LLM Service
    result = generate_chat_response(request.message, context=enriched_context)
    
    return {
        "reply": result["text"],
        "offer": result["offer"],
        "status": "success"
    }

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    # Placeholder for Document Triage Agent logic
    return {
        "filename": file.filename,
        "message": "Documento ricevuto. L'AI lo analizzerà per estrarre specifiche tecniche.",
        "status": "processing"
    }
