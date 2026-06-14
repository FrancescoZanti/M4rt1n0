from pydantic import BaseModel, Field
from typing import List

class LineItem(BaseModel):
    id: str = Field(description="ID univoco o numero di riga (es. '1', '2')")
    code: str = Field(description="Codice prodotto realistico per industria ceramica (es. FR-400-BASE, MOT-480, SRV-01)")
    description: str = Field(description="Descrizione dettagliata e tecnica del componente")
    quantity: float = Field(description="Quantità richiesta")
    unitPrice: float = Field(description="Prezzo unitario in euro")
    discount: float = Field(description="Sconto percentuale applicato (da 0 a 100)")

class OfferData(BaseModel):
    customerName: str = Field(description="Nome dell'azienda cliente dedotto o inventato")
    projectName: str = Field(description="Titolo del progetto o configurazione dell'impianto")
    notes: str = Field(description="Note commerciali a corredo del preventivo, con focus su vincoli, installazione e mercato")
    items: List[LineItem] = Field(description="Distinta base dei componenti dell'impianto")
