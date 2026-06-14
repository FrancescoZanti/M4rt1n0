#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Deploy AI Sales Assistant (Podman)   ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check if podman-compose is installed, if not fallback to podman compose
if command -v podman-compose &> /dev/null; then
    COMPOSE_CMD="podman-compose"
elif podman compose version &> /dev/null; then
    COMPOSE_CMD="podman compose"
else
    echo "Errore: Né podman-compose né podman compose sono installati."
    exit 1
fi

echo -e "${GREEN}Creazione della directory dati per SQLite...${NC}"
mkdir -p data

echo -e "${GREEN}Costruzione delle immagini e avvio dei container in background (-d)...${NC}"
$COMPOSE_CMD up -d --build

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}Applicazione avviata in Produzione!${NC}"
echo -e "Frontend disponibile su: http://localhost:80"
echo -e "Backend API disponibili su: http://localhost:8000/docs"
echo -e "Usa '$COMPOSE_CMD logs -f' per vedere i log in tempo reale."
