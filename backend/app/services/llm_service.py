from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import PydanticOutputParser
from app.core.config import settings
from app.schemas.offer import OfferData
import re

def get_llm():
    """
    Istanzia il client LLM in base alla configurazione scelta (Cloud o Locale).
    Questo ci permette di switchare tra Azure, OpenAI e Ollama/vLLM 
    cambiando solo le variabili d'ambiente.
    """
    provider = settings.LLM_PROVIDER.lower()
    
    if provider == "azure":
        return AzureChatOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            api_key=settings.AZURE_OPENAI_API_KEY,
            temperature=0.2, # Bassa temperatura per maggiore precisione sui preventivi
        )
    elif provider == "openai":
        return ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
            temperature=0.2,
        )
    elif provider == "local":
        # Sia vLLM che Ollama supportano l'interfaccia compatibile con OpenAI.
        # Questo rende il codice estremamente pulito e agnostico.
        return ChatOpenAI(
            base_url=settings.LOCAL_LLM_BASE_URL,
            api_key="not-needed", # Le API locali spesso non richiedono chiave, ma la libreria si aspetta una stringa
            model=settings.LOCAL_LLM_MODEL,
            temperature=0.2,
        )
    else:
        raise ValueError(f"Provider LLM non valido configurato: {provider}")

def generate_chat_response(user_message: str, context: dict = None) -> dict:
    """
    Invia la richiesta del commerciale all'LLM e restituisce un dizionario
    con il testo della risposta e il JSON dell'offerta parsato.
    """
    llm = get_llm()
    parser = PydanticOutputParser(pydantic_object=OfferData)
    
    # Prompt di sistema arricchito
    system_prompt = f"""Sei l'AI Sales Assistant, un esperto commerciale per un'azienda metalmeccanica.
Il tuo compito è creare un preventivo basato sulle richieste dell'utente.

Devi RISPONDERE SOLO ED ESCLUSIVAMENTE con un oggetto JSON valido. Non aggiungere saluti, né prima né dopo il JSON.

La struttura del JSON DEVE essere questa (con campi in inglese):
{{
  "customerName": "Nome Cliente",
  "projectName": "Nome Progetto",
  "notes": "Note commerciali...",
  "items": [
    {{
      "id": "1",
      "code": "CODICE-PRODOTTO",
      "description": "Descrizione",
      "quantity": 1,
      "unitPrice": 1000.0,
      "discount": 0.0
    }}
  ]
}}

Regole aggiuntive:
- Usa ESCLUSIVAMENTE i prodotti presenti nel "Catalogo Prodotti Attuale". Se un prodotto richiesto non c'è, usa il più simile.
- Se l'utente non specifica le quantità, ipotizzale tu (es. 1 forno, 10 motori).
- Se non specifica il cliente, inventane uno verosimile.
- IMPORTANTISSIMO: L'array "items" non deve MAI essere vuoto, deve contenere almeno un prodotto pertinente alla richiesta.
"""
    
    if context:
         system_prompt += f"\n\nContesto aggiuntivo recuperato dal sistema:\n{context}"
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message)
    ]
    
    # Invocazione dell'LLM
    try:
        response_text = llm.invoke(messages).content
        
        offer_data = None
        
        # Tentiamo subito l'estrazione JSON con una Regex permissiva che cerca il blocco più esterno
        import json
        
        # Cerca tutto ciò che sta tra { e } in modo avido
        json_match = re.search(r'(\{.*\})', response_text, re.DOTALL)
        if json_match:
            try:
                offer_data = json.loads(json_match.group(1))
            except Exception:
                pass
                
        # Tentativo con il parser Pydantic se il primo fallisce
        if not offer_data:
            try:
                parsed_obj = parser.parse(response_text)
                offer_data = parsed_obj.model_dump()
            except Exception:
                pass

        # Puliamo la risposta togliendo il JSON per mostrare solo il saluto (se l'AI ha disubbidito)
        clean_text = re.sub(r'```(?:json)?\s*\{.*?\}\s*```', '', response_text, flags=re.DOTALL)
        clean_text = re.sub(r'\{.*\}', '', clean_text, flags=re.DOTALL).strip()
        
        # Se l'array items non esiste, lo forziamo a vuoto per sicurezza
        if offer_data and "items" not in offer_data:
            offer_data["items"] = []
        
        return {
            "text": clean_text if clean_text else "Ecco la configurazione generata:",
            "offer": offer_data
        }

    except Exception as e:
        return {
            "text": f"Errore: {str(e)}",
            "offer": None
        }

