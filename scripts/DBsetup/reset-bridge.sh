#!/bin/bash
# ==============================================================================
# ZUGCHAIN BRIDGE RESET TOOL
# ==============================================================================
# Clears the history (SQLite DB) of the Presale Bridge so it can re-sync.
# ==============================================================================

# Configuration
BRIDGE_DIR="/opt/zugchain-bridge"
DB_FILE="bridge_data.sqlite"
PM2_APP_NAME="zug-presale-bridge"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   ZUGCHAIN BRIDGE HISTORY RESET                              ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "This will delete the database: $BRIDGE_DIR/$DB_FILE"
echo "The bridge will forget all previous transactions and start fresh."
echo ""
read -p "Are you sure? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${CYAN}[INFO]${NC} Stopping Bridge..."
pm2 stop "$PM2_APP_NAME"

echo -e "${CYAN}[INFO]${NC} Deleting Database..."
if [ -f "$BRIDGE_DIR/$DB_FILE" ]; then
    rm -f "$BRIDGE_DIR/$DB_FILE"
    echo -e "${GREEN}[SUCCESS]${NC} Database deleted."
else
    echo -e "${YELLOW}[WARN]${NC} Database file not found (already clean?)."
fi

echo -e "${CYAN}[INFO]${NC} Restarting Bridge..."
pm2 restart "$PM2_APP_NAME"

echo ""
echo -e "${GREEN}SUCCESS! Bridge history has been reset.${NC}"
echo "Check logs with: pm2 logs $PM2_APP_NAME"
echo ""
