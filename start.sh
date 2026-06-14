#!/bin/bash

# Colori per l'output nel terminale
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Nessun colore

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Avvio AI Sales Assistant (Dev Mode) ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Controlli Pre-Avvio
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Attenzione: File backend/.env non trovato. Uso le impostazioni di default (local Ollama).${NC}"
    cp backend/.env.example backend/.env 2>/dev/null
fi

# Funzione per pulire i processi alla chiusura
cleanup() {
    echo -e "\n${BLUE}Chiusura dei servizi in corso...${NC}"
    # Uccide i processi in background che abbiamo lanciato
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Servizi terminati con successo.${NC}"
    exit
}

# Associa la funzione cleanup alla terminazione dello script (Ctrl+C)
trap cleanup SIGINT SIGTERM EXIT

# ========================================
# 2. Avvio Backend (FastAPI)
# ========================================
echo -e "\n${GREEN}[1/2] Preparazione Backend (FastAPI)...${NC}"
cd backend

# Crea il virtual environment se non esiste
if [ ! -d "venv" ]; then
    echo "Creazione Virtual Environment Python..."
    python3 -m venv venv
fi

# Attiva il venv e installa le dipendenze in background (silenziosamente)
source venv/bin/activate
echo "Controllo dipendenze Python..."
pip install -r requirements.txt > /dev/null 2>&1

# Avvia il server FastAPI
echo "Avvio Server FastAPI sulla porta 8000..."
uvicorn app.main:app --reload --port 8000 > backend_dev.log 2>&1 &
BACKEND_PID=$!
cd ..

# ========================================
# 3. Avvio Frontend (React / Vite)
# ========================================
echo -e "\n${GREEN}[2/2] Preparazione Frontend (React)...${NC}"
cd frontend

# Installa pacchetti se node_modules non c'è
if [ ! -d "node_modules" ]; then
    echo "Installazione dipendenze Node.js (potrebbe richiedere un minuto)..."
    npm install > /dev/null 2>&1
fi

# Avvia il server di sviluppo Vite
echo "Avvio Server Vite sulla porta 5173..."
npm run dev > frontend_dev.log 2>&1 &
FRONTEND_PID=$!
cd ..

# ========================================
# 4. Successo e Info
# ========================================
echo -e "\n${BLUE}=======================================${NC}"
echo -e "${GREEN}TUTTO PRONTO! L'ambiente è in esecuzione.${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "Frontend: ${YELLOW}http://localhost:5173${NC} (Usa questo link nel browser)"
echo -e "Backend : ${YELLOW}http://localhost:8000/docs${NC} (Swagger API UI)"
echo -e ""
echo -e "Controlla i file ${YELLOW}backend_dev.log${NC} e ${YELLOW}frontend_dev.log${NC} per vedere l'output dei server in caso di errori."
echo -e "Premi ${RED}Ctrl+C${NC} in questo terminale per spegnere tutto."

# Attende i processi per mantenere lo script attivo
wait
