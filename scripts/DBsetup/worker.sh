#!/bin/bash

# ==============================================================================
# ZugChain Queue Worker Installer (All-in-One)
# ==============================================================================
# This script:
# 1. Installs Node.js if not present
# 2. Installs npm dependencies (bullmq, pg, ioredis)
# 3. Creates the queue-worker.js file with embedded code
# 4. Starts the worker in the background
#
# Usage: chmod +x install_queue_worker.sh && sudo ./install_queue_worker.sh
# ==============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

WORK_DIR="/opt/zugchain-worker"
LOG_FILE="/var/log/queue-worker.log"

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (sudo)"
   exit 1
fi

# 1. Install Node.js if not present
log_info "Checking Node.js..."
if ! command -v node &> /dev/null; then
    log_info "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    log_success "Node.js installed: $(node -v)"
else
    log_success "Node.js already installed: $(node -v)"
fi

# 2. Create work directory
log_info "Setting up work directory: $WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# 3. Initialize npm and install dependencies
if [ ! -f "$WORK_DIR/node_modules/bullmq/package.json" ]; then
    log_info "Installing npm dependencies..."
    npm init -y > /dev/null 2>&1
    npm install bullmq pg ioredis --save > /dev/null 2>&1
    log_success "Dependencies installed"
else
    log_success "Dependencies already installed"
fi

# 4. Create the queue-worker.js file (EMBEDDED)
log_info "Creating queue-worker.js..."

cat > "$WORK_DIR/queue-worker.js" << 'WORKER_EOF'
/**
 * ENTERPRISE GRADE QUEUE WORKER (STANDALONE)
 * Handles background processing for staking rewards, streaks, and referral bonuses.
 */

const { Worker } = require('bullmq');
const { Pool } = require('pg');
const Redis = require('ioredis');

const CONFIG = {
    REDIS_URL: 'redis://:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@127.0.0.1:6381',
    DB_URL: 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@127.0.0.1:7433/zug_incentive',
    QUEUE_NAME: 'IncentiveQueue',
    CONCURRENCY: 10,
};

console.log('\n========== QUEUE WORKER ==========');
console.log(`[BOOT] Redis: 127.0.0.1:6381`);
console.log(`[BOOT] Database: 127.0.0.1:7433`);
console.log('===================================\n');

const Logger = {
    info: (msg, c = "WORKER") => console.log(`\x1b[32m[${new Date().toISOString()}] [INFO] [${c}] ${msg}\x1b[0m`),
    warn: (msg, c = "WORKER") => console.warn(`\x1b[33m[${new Date().toISOString()}] [WARN] [${c}] ${msg}\x1b[0m`),
    error: (msg, c = "WORKER", e) => { console.error(`\x1b[31m[${new Date().toISOString()}] [ERROR][${c}] ${msg}\x1b[0m`); if(e) console.error(e); },
    success: (msg, c = "WORKER") => console.log(`\x1b[36m[${new Date().toISOString()}] [OK] [${c}] ${msg}\x1b[0m`),
    debug: (msg, c = "DEBUG") => console.log(`\x1b[35m[${new Date().toISOString()}] [DEBUG][${c}] ${msg}\x1b[0m`)
};

const pool = new Pool({ connectionString: CONFIG.DB_URL });
pool.query('SELECT NOW()').then(r => Logger.success(`DB Connected: ${r.rows[0].now}`, 'DB')).catch(e => Logger.error(`DB Failed: ${e.message}`, 'DB'));

const redisConnection = new Redis(CONFIG.REDIS_URL, { maxRetriesPerRequest: null, family: 4, connectTimeout: 10000 });
redisConnection.on('connect', () => Logger.success('Redis Connected!', 'REDIS'));
redisConnection.on('error', (e) => Logger.error(`Redis Error: ${e.message}`, 'REDIS'));

async function invalidateCache(key) { try { await redisConnection.del(key); } catch(e) {} }

const worker = new Worker(CONFIG.QUEUE_NAME, async (job) => {
    const { type, data } = job.data;
    Logger.info(`Processing: ${type} | User: ${data.address?.slice(0, 10)}...`, 'JOB');

    try {
        if (type === 'STAKE_SYNC') await processStakeSync(data);
        else if (type === 'FAUCET_CLAIM') await processFaucetClaim(data);
        else Logger.warn(`Unknown Job: ${type}`, 'JOB');
        Logger.success(`Completed: ${type}`, 'JOB');
    } catch (err) {
        Logger.error(`Failed: ${type} - ${err.message}`, 'JOB');
        throw err;
    }
}, { connection: redisConnection, concurrency: CONFIG.CONCURRENCY });

async function processStakeSync(data) {
    const { address, amount, tierId, txHash, timestamp, eventType, isNative } = data;
    const basePoints = Math.floor(amount);
    let stakingMultiplier = tierId === 1 ? 1.2 : tierId === 2 ? 1.5 : 1.0;

    const userRes = await pool.query("SELECT multiplier FROM users WHERE address = $1", [address]);
    const referralMultiplier = parseFloat(userRes.rows[0]?.multiplier || '1.0');
    const stakePoints = Math.floor(basePoints * stakingMultiplier * referralMultiplier);

    if (stakePoints <= 0 && eventType !== 'STAKED') return;

    await pool.query('BEGIN');
    try {
        if (stakePoints > 0) {
            const taskKey = `${eventType}_V3_TIER_${tierId}`;
            const dupCheck = await pool.query("SELECT 1 FROM points_audit_log WHERE tx_hash = $1 AND task_type = $2", [txHash, taskKey]);
            if (dupCheck.rows.length === 0) {
                await pool.query(`INSERT INTO points_audit_log (address, points_awarded, task_type, tx_hash) VALUES ($1, $2, $3, $4)`, [address, stakePoints, taskKey, txHash]);
                await pool.query(`INSERT INTO users (address, points, total_claims, last_active) VALUES ($1, $2, 1, $3) ON CONFLICT (address) DO UPDATE SET points = users.points + $2, total_claims = users.total_claims + 1, last_active = $3`, [address, stakePoints, timestamp]);
                Logger.success(`+${stakePoints} Points (TX: ${txHash.slice(0,10)}...)`, 'POINTS');
            }
        }

        if (eventType === 'STAKED' && amount > 0) {
            const todayUTC = new Date().toISOString().split('T')[0];
            await pool.query(`INSERT INTO daily_streaks (address, streak_type, current_streak, last_action_date, updated_at, cooldown_start_at) VALUES ($1, 'STAKE', 1, $2::date, NOW(), NOW()) ON CONFLICT (address, streak_type) DO UPDATE SET current_streak = CASE WHEN daily_streaks.last_action_date = $2::date THEN daily_streaks.current_streak WHEN daily_streaks.last_action_date = ($2::date - INTERVAL '1 day')::date THEN CASE WHEN daily_streaks.current_streak >= 7 THEN 1 ELSE daily_streaks.current_streak + 1 END ELSE 1 END, updated_at = NOW(), last_action_date = $2::date, cooldown_start_at = CASE WHEN daily_streaks.last_action_date = $2::date THEN daily_streaks.cooldown_start_at ELSE NOW() END`, [address, todayUTC]);

            const dailyBonusKey = `DAILY_STAKE_BONUS_${todayUTC}`;
            const bonusCheck = await pool.query("SELECT 1 FROM points_audit_log WHERE address = $1 AND task_type = $2", [address, dailyBonusKey]);
            if (bonusCheck.rows.length === 0) {
                await pool.query(`INSERT INTO users (address, points, total_claims, last_active) VALUES ($1, 50, 0, $2) ON CONFLICT (address) DO UPDATE SET points = users.points + 50, last_active = $2`, [address, timestamp]);
                await pool.query(`INSERT INTO points_audit_log (address, points_awarded, task_type, tx_hash) VALUES ($1, 50, $2, $3)`, [address, dailyBonusKey, txHash]);
                Logger.success(`+50 Daily Stake Bonus`, 'BONUS');
            }
        }

        if (eventType === 'STAKED') {
            const bonusColumn = isNative ? 'zug_stake_bonus_paid' : 'vzug_stake_bonus_paid';
            const timeColumn = isNative ? 'first_zug_stake_at' : 'first_vzug_stake_at';
            const auditTask = isNative ? 'REFERRAL_REWARD_STAKE_ZUG' : 'REFERRAL_REWARD_STAKE_VZUG';
            const refCheck = await pool.query(`SELECT referrer_address FROM referrals WHERE referee_address = $1 AND ${bonusColumn} = FALSE`, [address]);
            if (refCheck.rows.length > 0) {
                const referrerAddress = refCheck.rows[0].referrer_address;
                const refAuditCheck = await pool.query("SELECT 1 FROM points_audit_log WHERE tx_hash = $1 AND task_type = $2", [txHash, auditTask]);
                if (refAuditCheck.rows.length === 0) {
                    await pool.query(`INSERT INTO users (address, points, total_referrals, referral_points, last_active) VALUES ($1, 250, 0, 250, $2) ON CONFLICT (address) DO UPDATE SET points = users.points + 250, referral_points = users.referral_points + 250, last_active = $2`, [referrerAddress, timestamp]);
                    await pool.query(`UPDATE referrals SET ${bonusColumn} = TRUE, ${timeColumn} = $2 WHERE referee_address = $1`, [address, timestamp]);
                    await pool.query(`INSERT INTO points_audit_log (address, points_awarded, task_type, tx_hash) VALUES ($1, 250, $2, $3)`, [referrerAddress, auditTask, txHash]);
                    await invalidateCache(`user:stats:${referrerAddress}`);
                    Logger.success(`+250 Referral Bonus to ${referrerAddress.slice(0,10)}...`, 'REFERRAL');
                }
            }
        }

        await pool.query('COMMIT');
        await invalidateCache(`user:stats:${address}`);
        await invalidateCache(`user:missions:${address}`);
    } catch (e) { await pool.query('ROLLBACK'); throw e; }
}

async function processFaucetClaim(data) {
    const { address, basePoints, multiplier, txHash, timestamp } = data;
    const boostedPoints = Math.floor(basePoints * multiplier);
    await pool.query('BEGIN');
    try {
        const taskKey = `FAUCET_CLAIM_${new Date().toISOString().split('T')[0]}`;
        await pool.query(`INSERT INTO users (address, points, total_claims, last_active) VALUES ($1, $2, 1, $3) ON CONFLICT (address) DO UPDATE SET points = users.points + $2, total_claims = users.total_claims + 1, last_active = $3`, [address, boostedPoints, timestamp]);
        await pool.query(`INSERT INTO points_audit_log (address, points_awarded, task_type, tx_hash) VALUES ($1, $2, $3, $4)`, [address, boostedPoints, taskKey, txHash || `faucet_${Date.now()}`]);
        const todayUTC = new Date().toISOString().split('T')[0];
        await pool.query(`INSERT INTO daily_streaks (address, streak_type, current_streak, last_action_date, updated_at) VALUES ($1, 'FAUCET', 1, $2::date, NOW()) ON CONFLICT (address, streak_type) DO UPDATE SET current_streak = CASE WHEN daily_streaks.last_action_date = $2::date THEN daily_streaks.current_streak WHEN daily_streaks.last_action_date = ($2::date - INTERVAL '1 day')::date THEN CASE WHEN daily_streaks.current_streak >= 7 THEN 1 ELSE daily_streaks.current_streak + 1 END ELSE 1 END, updated_at = NOW(), last_action_date = $2::date`, [address, todayUTC]);
        await pool.query('COMMIT');
        await invalidateCache(`user:stats:${address}`);
        Logger.success(`+${boostedPoints} Faucet Points`, 'FAUCET');
    } catch (e) { await pool.query('ROLLBACK'); throw e; }
}

worker.on('ready', () => Logger.success('Queue Worker Listening...', 'SYSTEM'));
worker.on('completed', (job) => Logger.success(`Done: ${job.id}`, 'QUEUE'));
worker.on('failed', (job, err) => Logger.error(`Failed: ${job?.id} - ${err.message}`, 'QUEUE'));

Logger.info('Queue Worker Initialized. Waiting for jobs...', 'SYSTEM');
WORKER_EOF

log_success "queue-worker.js created"

# 5. Install PM2 globally if not present
log_info "Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2 (Process Manager)..."
    npm install -g pm2
    log_success "PM2 installed"
else
    log_success "PM2 already installed"
fi

# 6. Create PM2 ecosystem config
log_info "Creating PM2 config..."

cat > "$WORK_DIR/ecosystem.config.js" << 'PM2_EOF'
module.exports = {
  apps: [{
    name: 'queue-worker',
    script: './queue-worker.js',
    cwd: '/opt/zugchain-worker',
    env: { NODE_ENV: 'production' },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 3000,
    error_file: '/var/log/queue-worker-error.log',
    out_file: '/var/log/queue-worker-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
};
PM2_EOF

log_success "PM2 config created"

# 7. Stop existing PM2 process if running
log_info "Stopping existing worker..."
pm2 delete queue-worker 2>/dev/null || true

# 8. Start with PM2
log_info "Starting Queue Worker with PM2..."
cd "$WORK_DIR"
pm2 start ecosystem.config.js

# 9. Save and setup startup
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true

sleep 2

if pm2 list | grep -q "queue-worker.*online"; then
    log_success "Queue Worker started! (PID: $(pm2 pid queue-worker))"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   Queue Worker Running! (PM2 Managed)                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${CYAN}Status:${NC}     pm2 status queue-worker"
    echo -e "  ${CYAN}Logs:${NC}       pm2 logs queue-worker"
    echo -e "  ${CYAN}Restart:${NC}    pm2 restart queue-worker"
    echo -e "  ${CYAN}Monitor:${NC}    pm2 monit"
    echo ""
else
    log_error "Worker failed to start. Check: pm2 logs queue-worker"
    exit 1
fi
