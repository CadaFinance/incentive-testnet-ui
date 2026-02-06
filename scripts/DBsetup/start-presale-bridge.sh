#!/bin/bash

# ==============================================================================
# ZugChain Presale Bridge Bot Installer (Production-Grade with PM2)
# ==============================================================================
# usage: chmod +x start-presale-bridge.sh && sudo ./start-presale-bridge.sh
# ==============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

WORK_DIR="/opt/zugchain-bridge"

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Check root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (sudo)"
   exit 1
fi

# LOAD CONFIGURATION
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/setup.env" ]; then
    log_info "Loading contract addresses from setup.env..."
    source "$SCRIPT_DIR/setup.env"
else
    log_error "setup.env NOT FOUND in $SCRIPT_DIR!"
    log_error "Please create it with the required contract addresses."
    exit 1
fi

# VALIDATE CONFIGURATION
REQUIRED_VARS=("ETH_ZUG_TOKEN" "ETH_PRESALE_CONTRACT" "VZUG_CONTRACT_ADDRESS")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        log_error "Missing required variable in setup.env: $VAR"
        exit 1
    fi
done

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║       ZugChain Presale Bot - Production Deployment           ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Install Node.js/PM2 (if not present)
log_info "Checking Node.js & PM2..."
if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2..."
    if ! command -v npm &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    npm install -g pm2
    log_success "PM2 installed"
else
    log_success "PM2 already installed"
fi

# 2. Setup Work Directory
log_info "Setting up work directory: $WORK_DIR"
mkdir -p "$WORK_DIR"

# 3. Create Bridge Bot Script (Embedded)
log_info "Creating zugchain-presale-bridge.py..."

# Embed Python script with SQLite Logic
cat > "$WORK_DIR/zugchain-presale-bridge.py" << 'PYTHON_EOF'
#!/usr/bin/env python3
import time
import sqlite3
import requests
import os
from web3 import Web3
try:
    from web3.middleware import geth_poa_middleware
except ImportError:
    from web3.middleware import ExtraDataToPOAMiddleware as geth_poa_middleware

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# 1. ETHEREUM MAINNET (Source)
ETHERSCAN_API_KEY = "VCCSK5H7ZNGJRKADVRZHF1B1AKJR1MD32H"
ETH_ZUG_TOKEN = os.getenv("ETH_ZUG_TOKEN")
ETH_PRESALE_CONTRACT = os.getenv("ETH_PRESALE_CONTRACT")
ETHERSCAN_API_URL = "https://api.etherscan.io/v2/api"

# 2. ZUGCHAIN TESTNET (Destination)
ZUG_RPC_URL = "http://127.0.0.1:8545"
ZUG_CHAIN_ID = 824642
REWARDS_PRIVATE_KEY = "0x766627b44fc2afc101672a7d34697993bcd91b84c25069d2f48f75b186562da7"
VZUG_CONTRACT_ADDRESS = os.getenv("VZUG_CONTRACT_ADDRESS")

# 3. SETTINGS
DB_FILE = "bridge_data.sqlite"
POLL_INTERVAL = 30
START_BLOCK_DEFAULT = 24345528

# ==============================================================================
# SETUP
# ==============================================================================

# Connect to ZugChain
w3 = Web3(Web3.HTTPProvider(ZUG_RPC_URL))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)
account = w3.eth.account.from_key(REWARDS_PRIVATE_KEY)

# Init DB
conn = sqlite3.connect(DB_FILE, check_same_thread=False)
cursor = conn.cursor()

# Create Tables (if not exists)
cursor.execute('''
    CREATE TABLE IF NOT EXISTS processed_txs (
        tx_hash TEXT PRIMARY KEY,
        block_number INTEGER,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
''')
cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
''')
conn.commit()

# Init vZUG Contract
erc20_abi = [
    {"constant": False, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"}
]
vzug_contract = w3.eth.contract(address=VZUG_CONTRACT_ADDRESS, abi=erc20_abi)

TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
PRESALE_TOPIC = "0x000000000000000000000000" + ETH_PRESALE_CONTRACT[2:].lower()

# ==============================================================================
# DATABASE FUNCTIONS
# ==============================================================================

def get_last_block():
    cursor.execute("SELECT value FROM settings WHERE key='last_block'")
    row = cursor.fetchone()
    if row:
        return int(row[0])
    return START_BLOCK_DEFAULT

def update_last_block(block_num):
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_block', ?)", (str(block_num),))
    conn.commit()

def is_processed(tx_hash):
    cursor.execute("SELECT 1 FROM processed_txs WHERE tx_hash=?", (tx_hash,))
    return cursor.fetchone() is not None

def mark_processed(tx_hash, block_number):
    try:
        cursor.execute("INSERT INTO processed_txs (tx_hash, block_number) VALUES (?, ?)", (tx_hash, block_number))
        conn.commit()
    except sqlite3.IntegrityError:
        # Already exists
        pass

# ==============================================================================
# LOGIC
# ==============================================================================

def get_logs(from_block):
    params = {
        "module": "logs", "action": "getLogs", "fromBlock": from_block, "toBlock": "latest",
        "address": ETH_ZUG_TOKEN, "topic0": TRANSFER_TOPIC, "topic1": PRESALE_TOPIC,
        "apikey": ETHERSCAN_API_KEY, "chainid": "1"
    }
    try:
        response = requests.get(ETHERSCAN_API_URL, params=params, timeout=10)
        data = response.json()
        if data["status"] == "1": return data["result"]
        elif data["message"] == "No records found": return []
        else:
            print(f"⚠️ Etherscan Error: {data['message']}")
            return []
    except Exception as e:
        print(f"⚠️ Network Error: {e}")
        return []

def send_rewards(to_address, amount_wei, original_tx):
    try:
        to_address_checksum = Web3.to_checksum_address(to_address)
        
        # Check Balances
        vzug_balance = vzug_contract.functions.balanceOf(account.address).call()
        if vzug_balance < amount_wei:
            print(f"❌ Insufficient vZUG! Needed: {amount_wei}, Has: {vzug_balance}")
            return False

        native_balance = w3.eth.get_balance(account.address)
        required_native = amount_wei + w3.to_wei(0.01, 'ether')
        if native_balance < required_native:
             print(f"❌ Insufficient Native ZUG! Needed: {required_native}, Has: {native_balance}")
             return False

        # Nonce
        nonce = w3.eth.get_transaction_count(account.address, 'pending')

        # 1. Send Native
        tx_native = {
            'to': to_address_checksum, 'value': amount_wei, 'gas': 21000,
            'gasPrice': w3.eth.gas_price, 'nonce': nonce, 'chainId': ZUG_CHAIN_ID
        }
        signed_native = w3.eth.account.sign_transaction(tx_native, REWARDS_PRIVATE_KEY)
        tx_hash_native = w3.eth.send_raw_transaction(signed_native.raw_transaction)
        
        # 2. Send vZUG
        tx_token = vzug_contract.functions.transfer(to_address_checksum, amount_wei).build_transaction({
            'from': account.address, 'nonce': nonce + 1, 'gas': 200000,
            'gasPrice': w3.eth.gas_price, 'chainId': ZUG_CHAIN_ID
        })
        signed_token = w3.eth.account.sign_transaction(tx_token, REWARDS_PRIVATE_KEY)
        tx_hash_token = w3.eth.send_raw_transaction(signed_token.raw_transaction)

        print(f"⏳ Waiting for confirmations for {original_tx}...")
        w3.eth.wait_for_transaction_receipt(tx_hash_native)
        w3.eth.wait_for_transaction_receipt(tx_hash_token)

        print(f"✅ Processed {to_address} (Amount: {amount_wei})")
        return True

    except Exception as e:
        print(f"❌ Error for {to_address}: {e}")
        return False

def main():
    print(f"🌉 Bridge Started. Treasury: {account.address}")
    
    while True:
        try:
            last_block = get_last_block()
            print(f"🔍 Checking from block {last_block}...", end="\r")
            
            logs = get_logs(last_block + 1)
            
            max_block_seen = last_block
            
            if logs:
                print(f"\n📦 Found {len(logs)} events")
                
                for log in logs:
                    block_number = int(log["blockNumber"], 16)
                    tx_hash = log["transactionHash"]
                    
                    if block_number > max_block_seen:
                        max_block_seen = block_number
                    
                    # 1. ATOMIC CHECK: Check DB immediately
                    if is_processed(tx_hash):
                        print(f"⏭️ Skipping duplicate: {tx_hash}")
                        continue
                    
                    # Process
                    topic2 = log["topics"][2]
                    to_address = "0x" + topic2[26:]
                    amount_wei = int(log["data"], 16)
                    
                    print(f"⚡ Processing: {tx_hash}")
                    if send_rewards(to_address, amount_wei, tx_hash):
                        # 2. COMMIT: Mark as processed immediately
                        mark_processed(tx_hash, block_number)
                    else:
                        print("⚠️ Failed! Will retry next loop.")
                        # Do not update last_block if critical failure
                        max_block_seen = last_block
                        break 
            
            # Save progress
            if max_block_seen > last_block:
                update_last_block(max_block_seen)
            
            time.sleep(POLL_INTERVAL)
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
PYTHON_EOF

chmod +x "$WORK_DIR/zugchain-presale-bridge.py"
log_success "Python script created."

# 4. Install Dependencies
log_info "Installing Python dependencies..."
pip3 install web3 requests --break-system-packages > /dev/null 2>&1

# 5. Create PM2
log_info "Creating PM2 config..."
cat > "$WORK_DIR/ecosystem.config.js" << PM2_EOF
module.exports = {
  apps: [{
    name: 'zug-presale-bridge',
    script: './zugchain-presale-bridge.py',
    interpreter: 'python3',
    cwd: '/opt/zugchain-bridge',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 3000,
    out_file: '/var/log/zug-bridge-out.log',
    error_file: '/var/log/zug-bridge-error.log',
    max_memory_restart: '300M',
    env: {
       ETH_ZUG_TOKEN: "$ETH_ZUG_TOKEN",
       ETH_PRESALE_CONTRACT: "$ETH_PRESALE_CONTRACT",
       VZUG_CONTRACT_ADDRESS: "$VZUG_CONTRACT_ADDRESS"
    }
  }]
};
PM2_EOF

# 6. Start
cd "$WORK_DIR"
pm2 delete zug-presale-bridge 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true

log_success "Deployment Complete!"
