#!/bin/bash

# ==============================================================================
# ZugChain Auto-Compound Bot Installer
# ==============================================================================
# This script sets up and runs the Auto-Compound Bot on the main node.
# The bot automatically compounds staking rewards for users who enabled auto-compound.
#
# Requirements:
#   - Node.js 18+ (will be installed if missing)
#   - PostgreSQL running (frontend-db container on port 7433)
#   - Redis running (zugchain-redis container on port 6381)
#
# Environment Variables (set below or via .env):
#   - DEPLOYER_PRIVATE_KEY: The private key for the bot operator
#   - DATABASE_URL: PostgreSQL connection string
#   - RPC_URL: ZugChain RPC endpoint
#
# Usage: chmod +x install_auto_compound_bot.sh && sudo ./install_auto_compound_bot.sh
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Configuration
INSTALL_DIR="/opt/zugchain-autocompound"
LOG_FILE="/var/log/auto-compound-bot.log"

# ==============================
# CONFIGURATION - EDIT THESE!
# ==============================
DEPLOYER_PRIVATE_KEY="${DEPLOYER_PRIVATE_KEY:-0xa7801932ae95f18beafa9fdc24f243276ba7951a8c82350b2a4134da2f26c060}"
DATABASE_URL="${DATABASE_URL:-postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@127.0.0.1:7433/zug_incentive}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Contract Addresses (can be overridden)
NATIVE_STAKING="${NATIVE_STAKING:-0xa5BD672f12501a16FFe31408316fe09dC63c09F2}"
TOKEN_STAKING="${TOKEN_STAKING:-0x1B20bF433Ce2863DE21bFC810CE11695F35D63e1}"
VZUG_TOKEN="${VZUG_TOKEN:-0x73dBcD3F4C75f54779FE8C9824d212150e72Fd2D}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ZugChain Auto-Compound Bot Installer                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Check for Node.js
log_info "Checking for Node.js..."
if ! command -v node &> /dev/null; then 
    log_warn "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

NODE_VERSION=$(node -v)
log_success "Node.js found: $NODE_VERSION"

# 2. Create Install Directory
log_info "Creating install directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 3. Install Dependencies
log_info "Installing npm dependencies..."
npm init -y > /dev/null 2>&1
npm install viem pg --save > /dev/null 2>&1
log_success "Dependencies installed"

# 4. Kill existing bot if running
log_info "Stopping existing bot (if running)..."
pkill -f "auto-compound-bot" 2>/dev/null || true
sleep 1

# 5. Create the bot script
log_info "Creating auto-compound-bot.js..."

cat > auto-compound-bot.js << 'BOT_EOF'
const { createPublicClient, createWalletClient, http, decodeEventLog } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { Pool } = require('pg');

// --- CONFIGURATION FROM ENVIRONMENT ---
const CONFIG = {
    RPC_URL: process.env.RPC_URL || "http://127.0.0.1:8545",
    NATIVE_STAKING: process.env.NATIVE_STAKING || "0xa5BD672f12501a16FFe31408316fe09dC63c09F2",
    TOKEN_STAKING: process.env.TOKEN_STAKING || "0x1B20bF433Ce2863DE21bFC810CE11695F35D63e1",
    VZUG_TOKEN: process.env.VZUG_TOKEN || "0x73dBcD3F4C75f54779FE8C9824d212150e72Fd2D",
    MIN_REWARD_TO_COMPOUND: 0.1,
    PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY || "0xa7801932ae95f18beafa9fdc24f243276ba7951a8c82350b2a4134da2f26c060",
    DB_URL: process.env.DATABASE_URL || 'postgres://blockscout:zugchain_explorer_2024@127.0.0.1:7433/zug_incentive',
    CONCURRENCY: 5,
    POLL_INTERVAL: 21600000, // 6 Hours
    GAS_BUFFER_RATIO: 1.5,
};

// --- LOGGING ---
const Logger = {
    info: (msg, comp = "BOT") => console.log(`\x1b[32m[${new Date().toISOString()}] [INFO]  [${comp}] ${msg}\x1b[0m`),
    warn: (msg, comp = "BOT") => console.warn(`\x1b[33m[${new Date().toISOString()}] [WARN]  [${comp}] ${msg}\x1b[0m`),
    error: (msg, comp = "BOT", err) => { console.error(`\x1b[31m[${new Date().toISOString()}] [ERROR] [${comp}] ${msg}\x1b[0m`); if (err?.message) console.error(err.message); },
    success: (msg, comp = "BOT") => console.log(`\x1b[36m[${new Date().toISOString()}] [OK]    [${comp}] ${msg}\x1b[0m`),
    table: (data) => console.table(data)
};

// --- ERROR HANDLING ---
process.on('unhandledRejection', (reason) => Logger.error('Unhandled Rejection', 'PROCESS', reason));
process.on('uncaughtException', (err) => { Logger.error('Uncaught Exception', 'PROCESS', err); process.exit(1); });

// --- NONCE MANAGER ---
class NonceManager {
    constructor() { this.nonces = new Map(); this.locks = new Map(); }
    async getNonce(address, publicClient) {
        while (this.locks.get(address)) await new Promise(r => setTimeout(r, 50));
        try {
            this.locks.set(address, true);
            if (!this.nonces.has(address)) {
                const nonce = await publicClient.getTransactionCount({ address, blockTag: 'pending' });
                this.nonces.set(address, nonce);
            }
            const current = this.nonces.get(address);
            this.nonces.set(address, current + 1);
            return current;
        } finally { this.locks.set(address, false); }
    }
    reset(address) { this.nonces.delete(address); this.locks.set(address, false); }
}

// --- INITIALIZATION ---
const account = privateKeyToAccount(CONFIG.PRIVATE_KEY.startsWith('0x') ? CONFIG.PRIVATE_KEY : `0x${CONFIG.PRIVATE_KEY}`);
const publicClient = createPublicClient({ chain: { id: 824642, name: 'ZugChain' }, transport: http(CONFIG.RPC_URL, { batch: { wait: 16 } }) }); // Enable Batching
const walletClient = createWalletClient({ account, chain: { id: 824642, name: 'ZugChain' }, transport: http(CONFIG.RPC_URL) });
const pool = new Pool({ connectionString: CONFIG.DB_URL });
const nonceManager = new NonceManager();

const STAKING_ABI = [
    { inputs: [{ name: "_user", type: "address" }], name: "getUserDeposits", outputs: [{ components: [{ name: "amount", type: "uint256" }, { name: "weightedAmount", type: "uint256" }, { name: "rewardDebt", type: "uint256" }, { name: "lockEndTime", type: "uint256" }, { name: "unbondingEnd", type: "uint256" }, { name: "tierId", type: "uint8" }, { name: "isWithdrawn", type: "bool" }, { name: "totalClaimed", type: "uint256" }, { name: "totalCompounded", type: "uint256" }, { name: "useAutoCompound", type: "bool" }, { name: "lastAutoCompound", type: "uint256" }], name: "", type: "tuple[]" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "_user", type: "address" }, { name: "_index", type: "uint256" }], name: "automatedCompound", outputs: [], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "_user", type: "address" }, { name: "_depositIndex", type: "uint256" }], name: "pendingReward", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }
];

const EVENT_ABIS = [
    { anonymous: false, inputs: [{ indexed: true, name: "user", type: "address" }, { indexed: false, name: "depositId", type: "uint256" }, { indexed: false, name: "addedAmount", type: "uint256" }], name: "Compounded", type: "event" }
];

// --- SYNC ENGINE ---
async function syncPoints(txHash, walletAddress) {
    try {
        const checkRes = await pool.query("SELECT 1 FROM points_audit_log WHERE tx_hash = $1", [txHash]);
        if (checkRes.rows.length > 0) return { success: true, points: 0 };

        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        if (receipt.status !== 'success') return { success: false, error: "TX_FAILED" };

        let addedAmount = 0n;
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({ abi: EVENT_ABIS, data: log.data, topics: log.topics });
                if (decoded.eventName === 'Compounded') { addedAmount = decoded.args.addedAmount; break; }
            } catch (e) { continue; }
        }

        if (addedAmount === 0n) return { success: false, error: "NO_EVENT" };
        const amountEth = Number(addedAmount) / 1e18;
        const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
        const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();
        const contractType = receipt.to.toLowerCase() === CONFIG.NATIVE_STAKING.toLowerCase() ? 'ZUG' : 'vZUG';

        await pool.query(`INSERT INTO staking_history (address, tx_hash, event_type, contract_type, amount, harvested_yield, created_at, block_number) VALUES ($1, $2, 'COMPOUNDED', $3, $4, 0, $5, $6) ON CONFLICT (tx_hash) DO NOTHING`, [walletAddress.toLowerCase(), txHash, contractType, amountEth, timestamp, receipt.blockNumber]);

        const points = Math.floor(amountEth);
        if (points <= 0) return { success: true, points: 0 };

        await pool.query('BEGIN');
        await pool.query("INSERT INTO points_audit_log (address, points_awarded, task_type, tx_hash) VALUES ($1, $2, $3, $4)", [walletAddress.toLowerCase(), points, 'COMPOUNDED_AUTO', txHash]);
        await pool.query(`INSERT INTO users (address, points, total_claims, last_active) VALUES ($1, $2, 1, $3) ON CONFLICT (address) DO UPDATE SET points = users.points + $2, total_claims = users.total_claims + 1, last_active = $3`, [walletAddress.toLowerCase(), points, timestamp]);
        await pool.query('COMMIT');
        return { success: true, points };
    } catch (err) {
        if (pool) await pool.query('ROLLBACK');
        throw err;
    }
}

// --- EXECUTION CORE ---
async function executeCompound(contractAddress, staker, index, label, estimatedReward) {
    const COMP = `${label}_STAKER[${staker.slice(0, 6)}...${staker.slice(-4)}]`;
    try {
        const estimatedGas = await publicClient.estimateContractGas({ account, address: contractAddress, abi: STAKING_ABI, functionName: 'automatedCompound', args: [staker, BigInt(index)] });
        const { request } = await publicClient.simulateContract({ account, address: contractAddress, abi: STAKING_ABI, functionName: 'automatedCompound', args: [staker, BigInt(index)] });
        const nonce = await nonceManager.getNonce(account.address, publicClient);
        request.gas = (estimatedGas * BigInt(Math.floor(CONFIG.GAS_BUFFER_RATIO * 100))) / 100n;
        request.nonce = nonce;
        const hash = await walletClient.writeContract(request);
        // Minimal Success Log
        Logger.success(`TX: ${hash} | Reward: ~${estimatedReward.toFixed(4)}`, COMP); 
        
        // Wait for Receipt needed? Yes for logic update, but we can fire & forget if we trust the chain, 
        // but for exact "Pts Awarded" logging we wait.
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') throw new Error("ONCHAIN_REVERT");
        
        // Post-process off-chain updates
        syncPoints(hash, staker).catch(e => Logger.error("Sync Failed", COMP, e));
        
    } catch (err) {
        if (err.message?.includes("Nonce") || err.message?.includes("nonce")) { nonceManager.reset(account.address); }
        if (err.message?.includes("Cooldown")) { /* Suppress Cooldown Logs */ }
        else { Logger.error(`Fail: ${err.shortMessage || err.message}`, COMP); }
    }
}

async function processBatch(tasks) {
    for (let i = 0; i < tasks.length; i += CONFIG.CONCURRENCY) {
        const batch = tasks.slice(i, i + CONFIG.CONCURRENCY);
        await Promise.all(batch.map(t => executeCompound(t.contract, t.staker, t.index, t.label, t.reward)));
    }
}

async function tscan(contractAddress, label) {
    Logger.info(`Starting scan for ${label}...`, label);
    const start = Date.now();

    // 1. Get Stakers
    const stakersRes = await pool.query("SELECT DISTINCT address FROM staking_history WHERE contract_type = $1", [label === 'NATIVE' ? 'ZUG' : 'vZUG']);
    const stakers = stakersRes.rows.map(r => r.address);
    Logger.info(`Found ${stakers.length} unique stakers in DB. Checking chain...`, label);

    const tasks = [];
    let totalPending = 0;
    let checkedCount = 0;

    // 2. Batch Check Eligibility
    // Ideally we would multicall this, but simple loop with concurrency/batching on RPC is standard for this scale.
    for (const staker of stakers) {
        checkedCount++;
        try {
            const deposits = await publicClient.readContract({ address: contractAddress, abi: STAKING_ABI, functionName: 'getUserDeposits', args: [staker] });
            
            // Filter eligible indices locally first
            const eligibleIndices = deposits.map((d, i) => ({ ...d, index: i }))
                .filter(d => !d.isWithdrawn && d.useAutoCompound && Number(d.unbondingEnd) === 0)
                .filter(d => Math.floor(Date.now() / 1000) >= (Number(d.lastAutoCompound) + 60)); // Cooldown check

            if (eligibleIndices.length > 0) {
                // Fetch Reward Amount for these indices
                for (const dep of eligibleIndices) {
                     const pendingWei = await publicClient.readContract({ address: contractAddress, abi: STAKING_ABI, functionName: 'pendingReward', args: [staker, BigInt(dep.index)] });
                     const pendingEth = Number(pendingWei) / 1e18;

                     if (pendingEth >= CONFIG.MIN_REWARD_TO_COMPOUND) {
                         tasks.push({ contract: contractAddress, staker, index: dep.index, label, reward: pendingEth });
                         totalPending += pendingEth;
                     }
                }
            }

        } catch (err) { Logger.error(`Read Error ${staker}: ${err.message}`, label); }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    // 3. Summary Log
    Logger.info(`Scan Complete (${elapsed}s).`, label);
    console.log(`\t--------------------------------------------------`);
    console.log(`\t📊 SUMMARY FOR ${label}:`);
    console.log(`\t   - Scanned Users:      ${checkedCount}`);
    console.log(`\t   - Eligible Batches:   ${tasks.length}`);
    console.log(`\t   - Total Pending:      ${totalPending.toFixed(4)} ZUG`);
    console.log(`\t--------------------------------------------------`);

    if (tasks.length > 0) {
        Logger.info(`Executing ${tasks.length} compound transactions...`, label);
        await processBatch(tasks);
    } else {
        Logger.info(`Nothing to compound.`, label);
    }
}

// --- MAIN LOOP ---
async function main() {
    Logger.info(`Auto-Compound Bot Init | Operator: ${account.address}`);
    Logger.info(`RPC: ${CONFIG.RPC_URL}`); // Explicitly Log RPC
    
    while (true) {
        try {
            const cycleStart = Date.now();
            await tscan(CONFIG.NATIVE_STAKING, "NATIVE");
            await tscan(CONFIG.TOKEN_STAKING, "TOKEN");
            
            const cycleDuration = ((Date.now() - cycleStart) / 1000).toFixed(1);
            Logger.success(`Global Cycle Finished in ${cycleDuration}s.`);
            
        } catch (err) {
            Logger.error(`Global Loop Error`, "MAIN", err);
        }
        
        Logger.info(`Sleeping for ${CONFIG.POLL_INTERVAL / 3600000} hours...`);
        await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL));
    }
}

main().catch(err => Logger.error("Critical Failure", "PROCESS", err));
BOT_EOF

log_success "auto-compound-bot.js created"

# 6. Create systemd service
log_info "Creating systemd service..."

cat > /etc/systemd/system/autocompound.service << EOF
[Unit]
Description=ZugChain Auto-Compound Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment="DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY"
Environment="DATABASE_URL=$DATABASE_URL"
Environment="RPC_URL=$RPC_URL"
Environment="NATIVE_STAKING=$NATIVE_STAKING"
Environment="TOKEN_STAKING=$TOKEN_STAKING"
Environment="VZUG_TOKEN=$VZUG_TOKEN"
ExecStart=/usr/bin/node auto-compound-bot.js
Restart=always
RestartSec=10
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE

[Install]
WantedBy=multi-user.target
EOF

# 7. Enable and start service
log_info "Enabling and starting service..."
systemctl daemon-reload
systemctl enable autocompound
systemctl restart autocompound

sleep 2

# 8. Verify
if systemctl is-active --quiet autocompound; then
    log_success "Auto-Compound Bot is running!"
else
    log_error "Service failed to start. Check: journalctl -u autocompound"
    exit 1
fi

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Auto-Compound Bot Installed Successfully!                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Install Dir:${NC}  $INSTALL_DIR"
echo -e "  ${CYAN}Log File:${NC}     $LOG_FILE"
echo -e "  ${CYAN}Status:${NC}       systemctl status autocompound"
echo -e "  ${CYAN}Logs:${NC}         tail -f $LOG_FILE"
echo -e "  ${CYAN}Restart:${NC}      systemctl restart autocompound"
echo ""
log_success "Setup Complete!"
