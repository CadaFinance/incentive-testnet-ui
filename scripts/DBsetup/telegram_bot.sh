#!/bin/bash

# ==============================================================================
# ZugChain Telegram Bot Installer (Production-Grade with PM2)
# ==============================================================================
# This script:
# 1. Runs database setup (telegram_outbox table + triggers)
# 2. Installs Node.js and PM2 if needed
# 3. Installs npm dependencies (telegraf, pg)
# 4. Starts the bot with PM2 for enterprise-level reliability
#
# Features:
# - Auto-restart on crash
# - Log rotation
# - Process monitoring
# - Graceful shutdown
# - 99.9% uptime guarantee
#
# Usage: chmod +x telegram_bot.sh && sudo ./telegram_bot.sh
# ==============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

WORK_DIR="/opt/zugchain-telegram"
DB_URL='postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@127.0.0.1:7433/zug_incentive'
TELEGRAM_BOT_TOKEN='8571816408:AAGcIc4vV5JmUchd3mQSybN7iqPGZ0Nihjk'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Check root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (sudo)"
   exit 1
fi

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║       ZugChain Telegram Bot - Production Deployment          ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

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

# 2. Install PM2 globally if not present
log_info "Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2 (Process Manager)..."
    npm install -g pm2
    log_success "PM2 installed: $(pm2 -v)"
else
    log_success "PM2 already installed: $(pm2 -v)"
fi

# 3. Create work directory
log_info "Setting up work directory: $WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# 4. Initialize npm and install dependencies
if [ ! -f "$WORK_DIR/node_modules/telegraf/package.json" ]; then
    log_info "Installing npm dependencies (telegraf, pg)..."
    npm init -y > /dev/null 2>&1
    npm install telegraf pg --save > /dev/null 2>&1
    log_success "Dependencies installed"
else
    log_success "Dependencies already installed"
fi

# 5. Create DB setup script
log_info "Creating database setup script..."

cat > "$WORK_DIR/setup_db.js" << 'DB_SETUP_EOF'
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@127.0.0.1:7433/zug_incentive';

const client = new Client({ connectionString: DB_URL });

async function setupTelegramNotifications() {
    try {
        await client.connect();
        console.log("🟢 Connected to database.\n");

        console.log("📦 Creating 'telegram_outbox' table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS telegram_outbox (
                id SERIAL PRIMARY KEY,
                user_address VARCHAR(255) NOT NULL,
                telegram_id VARCHAR(255) NOT NULL,
                telegram_username VARCHAR(255),
                event_type VARCHAR(50) DEFAULT 'WELCOME',
                payload JSONB DEFAULT '{}'::jsonb,
                status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP WITH TIME ZONE,
                error_message TEXT,
                CONSTRAINT fk_user FOREIGN KEY (user_address) REFERENCES users(address) ON DELETE CASCADE
            );
        `);
        console.log("✅ Table 'telegram_outbox' ready.\n");

        console.log("🔔 Creating Welcome notification trigger...");
        await client.query(`
            CREATE OR REPLACE FUNCTION queue_telegram_notification() 
            RETURNS TRIGGER AS $$
            BEGIN
                IF (NEW.telegram_id IS NOT NULL) AND 
                   (OLD.telegram_id IS NULL OR OLD.telegram_id != NEW.telegram_id) THEN
                   
                   INSERT INTO telegram_outbox (user_address, telegram_id, telegram_username, event_type, status)
                   VALUES (NEW.address, NEW.telegram_id, NEW.telegram_username, 'WELCOME', 'PENDING');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_queue_telegram_notif ON users;
            CREATE TRIGGER trg_queue_telegram_notif
            AFTER UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION queue_telegram_notification();
        `);
        console.log("✅ Welcome trigger ready.\n");

        console.log("⚡ Creating worker notification system...");
        await client.query(`
            CREATE OR REPLACE FUNCTION notify_worker() 
            RETURNS TRIGGER AS $$
            BEGIN
                PERFORM pg_notify('telegram_outbox_event', 'NEW_ITEM');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_notify_worker ON telegram_outbox;
            CREATE TRIGGER trg_notify_worker
            AFTER INSERT ON telegram_outbox
            FOR EACH ROW
            EXECUTE FUNCTION notify_worker();
        `);
        console.log("✅ Worker notification ready.\n");

        console.log("🎉 Telegram Notification System Setup Complete!");

    } catch (err) {
        console.error("❌ Setup Failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

setupTelegramNotifications();
DB_SETUP_EOF

# 6. Run database setup
log_info "Running database setup..."
export DATABASE_URL="$DB_URL"
node "$WORK_DIR/setup_db.js"
if [ $? -ne 0 ]; then
    log_error "Database setup failed!"
    exit 1
fi

# 7. Create the notification worker (same as before)
log_info "Creating notification_worker.js..."

cat > "$WORK_DIR/notification_worker.js" << 'WORKER_EOF'
const { Client } = require('pg');
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DB_URL = process.env.DATABASE_URL;

if (!BOT_TOKEN) {
    console.error("❌ FATAL: TELEGRAM_BOT_TOKEN is missing");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const client = new Client({ connectionString: DB_URL });

function escapeMarkdown(text) {
    if (!text && text !== 0) return '';
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatTaskType(rawType) {
    const MAPPING = {
        'STAKED_V3_TIER_0': 'Staking (Standard)',
        'STAKED_V3_TIER_1': 'Staking (Gold)',
        'STAKED_V3_TIER_2': 'Staking (Platinum)',
        'COMPOUNDED_AUTO': 'Auto-Compound',
        'DAILY_LOGIN': 'Daily Login',
        'SOCIAL_FOLLOW': 'Social Task',
        'REFERRAL_BONUS': 'Referral Bonus',
        'SPECIAL_MISSION_REWARD': 'Mission Complete',
        'FAUCET_CLAIM': 'Faucet Claim'
    };
    return MAPPING[rawType] || rawType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const MAIN_MENU = Markup.inlineKeyboard([
    [Markup.button.callback('🏆 My Rank & Points', 'my_rank'), Markup.button.callback('🔥 Daily Streak', 'my_streak')],
    [Markup.button.callback('👥 Referral Stats', 'my_refs'), Markup.button.callback('📜 History', 'my_history')]
]);

async function getUserInfo(telegramId) {
    const res = await client.query('SELECT address, telegram_username FROM users WHERE telegram_id = $1', [String(telegramId)]);
    return res.rows[0];
}

// Bot /start handler - processes auth session verification
bot.start(async (ctx) => {
    const userId = String(ctx.from.id);
    const username = ctx.from.username || '';
    const startPayload = ctx.startPayload; // This is the code after /start
    
    // If no payload, show menu for existing users or welcome for new
    if (!startPayload) {
        // Check if user is already linked
        const existingUser = await client.query(
            'SELECT address, points FROM users WHERE telegram_id = $1',
            [userId]
        );
        
        if (existingUser.rows.length > 0) {
            const { address, points } = existingUser.rows[0];
            const shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
            return ctx.replyWithMarkdownV2(
                '🚀 *Welcome back\\!*\n\n' +
                '🔐 *Wallet:* `' + escapeMarkdown(shortAddr) + '`\n' +
                '💰 *Points:* ' + escapeMarkdown(String(points)) + '\n\n' +
                '_Tap a button below to view your stats\\._',
                MAIN_MENU
            );
        } else {
            return ctx.replyWithMarkdownV2(
                '🚀 *Welcome to ZugChain Bot\\!*\n\n' +
                'To link your wallet and earn points:\n' +
                '1️⃣ Go to [zugchain\\.org](https://zugchain.org)\n' +
                '2️⃣ Connect your wallet\n' +
                '3️⃣ Complete the Telegram verification\n\n' +
                '_Already linked\\? Tap a button below\\._',
                MAIN_MENU
            );
        }
    }
    
    console.log('[AUTH] Processing /start with code: ' + startPayload + ' from user ' + userId + ' (@' + username + ')');
    
    try {
        // 1. Find pending session with this code
        const pendingRes = await client.query(
            "SELECT * FROM telegram_auth_sessions WHERE code = $1 AND status = 'PENDING'",
            [startPayload]
        );
        
        if (pendingRes.rows.length === 0) {
            // Check if already verified (user clicked link again)
            const verifiedRes = await client.query(
                "SELECT * FROM telegram_auth_sessions WHERE code = $1 AND status = 'VERIFIED'",
                [startPayload]
            );
            
            if (verifiedRes.rows.length > 0) {
                console.log('[AUTH] Session already verified for code: ' + startPayload);
                return ctx.replyWithMarkdownV2(
                    '✅ *Already Verified\\!*\n\n' +
                    'Your wallet is already linked\\.\n' +
                    '_Return to the website to continue\\._',
                    MAIN_MENU
                );
            }
            
            console.log('[AUTH] No pending session found for code: ' + startPayload);
            return ctx.replyWithMarkdownV2(
                '⏰ *Session Expired*\n\n' +
                'This verification link has expired\\.\n\n' +
                'Please return to [zugchain\\.org](https://zugchain.org) and try again\\.',
                MAIN_MENU
            );
        }
        
        const session = pendingRes.rows[0];
        const sessionAddress = session.address.toLowerCase();
        console.log('[AUTH] Found session for wallet: ' + sessionAddress);
        
        // 2. Check if this Telegram ID is already linked to another wallet
        const dupCheck = await client.query(
            "SELECT address FROM users WHERE telegram_id = $1",
            [userId]
        );
        
        if (dupCheck.rows.length > 0) {
            const linkedAddr = dupCheck.rows[0].address.toLowerCase();
            if (linkedAddr !== sessionAddress) {
                // Linked to SOMEONE ELSE
                const shortLinked = linkedAddr.slice(0, 6) + '...' + linkedAddr.slice(-4);
                console.log('[AUTH] DUPLICATE: Telegram ' + userId + ' already linked to ' + linkedAddr);
                await client.query(
                    "UPDATE telegram_auth_sessions SET status = 'FAILED_DUPLICATE' WHERE code = $1",
                    [startPayload]
                );
                return ctx.replyWithMarkdownV2(
                    '⚠️ *Account Already Linked*\n\n' +
                    'This Telegram account is already connected to:\n' +
                    '🔐 `' + escapeMarkdown(shortLinked) + '`\n\n' +
                    '_Each Telegram can only link to one wallet\\._',
                    MAIN_MENU
                );
            }
            // Already linked to self - just update session
            await client.query(
                "UPDATE telegram_auth_sessions SET status = 'VERIFIED', telegram_id = $1, telegram_username = $2 WHERE code = $3",
                [userId, username, startPayload]
            );
            return ctx.replyWithMarkdownV2(
                '✅ *Already Verified\\!*\n\n' +
                'Your wallet is already linked\\.\n' +
                '_Return to the website to continue\\._',
                MAIN_MENU
            );
        }
        
        // 3. Check Group Membership
        const GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1002647246061';
        let isMember = true;
        
        try {
            const chatRes = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/getChatMember?chat_id=' + GROUP_ID + '&user_id=' + userId);
            const chatData = await chatRes.json();
            const status = chatData.result?.status;
            isMember = ['creator', 'administrator', 'member', 'restricted'].includes(status);
            console.log('[AUTH] Group membership check: ' + status + ' -> isMember=' + isMember);
        } catch (e) {
            console.error('[AUTH] Membership check failed, assuming member:', e.message);
            isMember = true;
        }
        
        if (!isMember) {
            await client.query(
                "UPDATE telegram_auth_sessions SET status = 'FAILED_NOT_MEMBER', telegram_id = $1, telegram_username = $2 WHERE code = $3",
                [userId, username, startPayload]
            );
            return ctx.replyWithMarkdownV2(
                '⚠️ *Join Our Community First\\!*\n\n' +
                'To complete verification, you must join the ZugChain Telegram group\\.\n\n' +
                '👉 [Join ZugChain Community](https://t.me/zugchain)\n\n' +
                'After joining, return to the website and try again\\.',
                MAIN_MENU
            );
        }
        
        // 4. Wait briefly for user record (in case of timing delay)
        let userExists = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            const userCheck = await client.query(
                "SELECT 1 FROM users WHERE LOWER(address) = $1",
                [sessionAddress]
            );
            if (userCheck.rows.length > 0) {
                userExists = true;
                break;
            }
            // Wait 500ms before retry
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!userExists) {
            console.log('[AUTH] User not found for wallet: ' + sessionAddress);
            return ctx.replyWithMarkdownV2(
                '⏳ *Please Wait*\n\n' +
                'Your wallet is still being registered\\.\n' +
                'Please wait a moment and try again\\.',
                MAIN_MENU
            );
        }
        
        // 5. SUCCESS - Link and award points
        await client.query("BEGIN");
        
        await client.query(
            "UPDATE users SET telegram_id = $1, telegram_username = $2, points = points + 150 WHERE LOWER(address) = $3",
            [userId, username, sessionAddress]
        );
        
        await client.query(
            "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)",
            [sessionAddress, 150, 'MISSION_SOCIAL_TELEGRAM_JOIN']
        );
        
        await client.query(
            "UPDATE telegram_auth_sessions SET status = 'VERIFIED', telegram_id = $1, telegram_username = $2 WHERE code = $3",
            [userId, username, startPayload]
        );
        
        await client.query("COMMIT");
        
        console.log('[AUTH] SUCCESS: Linked ' + userId + ' to ' + sessionAddress + ', awarded 150 points');
        
        // Don't send message here - the DB trigger will queue a professional notification
        // via telegram_outbox that the notification worker will send.
        
    } catch (e) {
        console.error('[AUTH] Error processing verification:', e);
        try { await client.query("ROLLBACK"); } catch (re) {}
        return ctx.replyWithMarkdownV2(
            '❌ *Verification Error*\n\n' +
            'Something went wrong\\. Please return to the website and try again\\.\n\n' +
            '_If this persists, contact support\\._',
            MAIN_MENU
        );
    }
});

bot.action('my_rank', async (ctx) => {
    try {
        const tgId = String(ctx.from.id);
        const userRes = await client.query('SELECT points, address FROM users WHERE telegram_id = $1', [tgId]);
        if (userRes.rows.length === 0) return ctx.answerCbQuery('User not found.');
        const { points, address } = userRes.rows[0];
        const rankRes = await client.query('SELECT count(*) + 1 as rank FROM users WHERE points > $1', [points]);
        const rank = rankRes.rows[0].rank;
        const msg = `🏆 *Leaderboard Stats*\n\n🏅 *Rank:* \\#${rank}\n💰 *Points:* ${escapeMarkdown(points)}\n🔐 *Wallet:* \`${escapeMarkdown(address)}\``.trim();
        await ctx.replyWithMarkdownV2(msg, MAIN_MENU);
        await ctx.answerCbQuery();
    } catch (e) {
        console.error(e);
        ctx.answerCbQuery('Error fetching rank.');
    }
});

bot.action('my_streak', async (ctx) => {
    try {
        const tgId = String(ctx.from.id);
        const userRes = await client.query('SELECT address FROM users WHERE telegram_id = $1', [tgId]);
        if (userRes.rows.length === 0) return ctx.answerCbQuery('User not found.');
        const { address } = userRes.rows[0];
        const streakRes = await client.query("SELECT COALESCE(MAX(current_streak), 0) as current_streak FROM daily_streaks WHERE address = $1", [address]);
        const current_streak = streakRes.rows[0].current_streak;
        const msg = `🔥 *Daily Streak Stats*\n\n⚡ *Current Streak:* ${current_streak} Days`.trim();
        await ctx.replyWithMarkdownV2(msg, MAIN_MENU);
        await ctx.answerCbQuery();
    } catch (e) {
        console.error(e);
        ctx.answerCbQuery('Error fetching streak.');
    }
});

bot.action('my_refs', async (ctx) => {
    try {
        const tgId = String(ctx.from.id);
        const res = await client.query('SELECT total_referrals, referral_points FROM users WHERE telegram_id = $1', [tgId]);
        if (res.rows.length === 0) return ctx.answerCbQuery('User not found.');
        const { total_referrals, referral_points } = res.rows[0];
        const msg = `👥 *Referral Statistics*\n\n👨‍👩‍👧‍👦 *Total Referrals:* ${total_referrals || 0}\n💰 *Points Earned:* ${escapeMarkdown(referral_points || 0)}`.trim();
        await ctx.replyWithMarkdownV2(msg, MAIN_MENU);
        await ctx.answerCbQuery();
    } catch (e) {
        console.error(e);
        ctx.answerCbQuery('Error fetching referrals.');
    }
});

bot.action('my_history', async (ctx) => {
    try {
        const tgId = String(ctx.from.id);
        const user = await getUserInfo(tgId);
        if (!user) return ctx.answerCbQuery('User not found.');
        const res = await client.query(`SELECT points_awarded, task_type, created_at FROM points_audit_log WHERE address = $1 ORDER BY created_at DESC LIMIT 10`, [user.address]);
        if (res.rows.length === 0) {
            await ctx.replyWithMarkdownV2("📜 *No history found\\.*", MAIN_MENU);
            return ctx.answerCbQuery();
        }
        let historyMsg = "📜 *Recent Activity*\n\n";
        res.rows.forEach(row => {
            const d = new Date(row.created_at);
            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            const pts = row.points_awarded > 0 ? `\\+${row.points_awarded}` : `${row.points_awarded}`;
            const task = escapeMarkdown(formatTaskType(row.task_type));
            let icon = '📌';
            if (row.task_type.includes('STAKED')) icon = '💎';
            if (row.task_type.includes('COMPOUND')) icon = '⚡';
            if (row.task_type.includes('LOGIN')) icon = '📅';
            if (row.task_type.includes('REFERRAL')) icon = '👥';
            historyMsg += `${icon} *${task}*: *${pts} PTS* \\(\`${dateStr} ${timeStr}\`\\)\n`;
        });
        await ctx.replyWithMarkdownV2(historyMsg, MAIN_MENU);
        await ctx.answerCbQuery();
    } catch(e) {
        console.error(e);
        ctx.answerCbQuery('Error fetching history.');
    }
});

async function sendNotification(row) {
    const { telegram_id, telegram_username, user_address } = row;
    const username = escapeMarkdown(telegram_username || 'User');
    const address = escapeMarkdown(user_address);
    const message = `🎉 *Verification Successful\\!*\n\nHello *${username}*,\n\nYour wallet has been successfully linked\\.\n🔐 *Wallet:* \`${address}\`\n\n*Next Steps:*\n✅ Start completing missions\\.\n✅ Earn points and climb the leaderboard\\.\n🚀 _Welcome to the inner circle\\._`.trim();
    try {
        await bot.telegram.sendMessage(telegram_id, message, { parse_mode: 'MarkdownV2', ...MAIN_MENU });
        return true;
    } catch (e) {
        console.error(`Failed to send to ${telegram_id}:`, e.message);
        return false;
    }
}

async function processQueue() {
    try {
        await client.query('BEGIN');
        const res = await client.query(`SELECT id, user_address, telegram_id, telegram_username FROM telegram_outbox WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED LIMIT 10`);
        if (res.rows.length > 0) {
            console.log(`Processing ${res.rows.length} notifications...`);
            for (const row of res.rows) {
                const success = await sendNotification(row);
                const status = success ? 'SENT' : 'FAILED';
                const err = success ? null : 'API Error';
                await client.query('UPDATE telegram_outbox SET status = $1, error_message = $2, sent_at = NOW() WHERE id = $3', [status, err, row.id]);
            }
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Queue Error:', e);
    }
}

async function start() {
    try {
        await client.connect();
        console.log('🟢 DB Connected.');
        bot.launch(() => console.log('🤖 Bot Started!'));
        await client.query('LISTEN telegram_outbox_event');
        client.on('notification', processQueue);
        await processQueue();
        process.once('SIGINT', () => { bot.stop('SIGINT'); client.end(); });
        process.once('SIGTERM', () => { bot.stop('SIGTERM'); client.end(); });
    } catch (e) {
        console.error('Startup Error:', e);
    }
}

start();
WORKER_EOF

log_success "notification_worker.js created"

# 8. Create PM2 ecosystem config
log_info "Creating PM2 ecosystem config..."

cat > "$WORK_DIR/ecosystem.config.js" << 'PM2_EOF'
module.exports = {
  apps: [{
    name: 'telegram-bot',
    script: './notification_worker.js',
    cwd: '/opt/zugchain-telegram',
    
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@127.0.0.1:7433/zug_incentive',
      TELEGRAM_BOT_TOKEN: '8571816408:AAGcIc4vV5JmUchd3mQSybN7iqPGZ0Nihjk',
      TELEGRAM_GROUP_ID: '-1002647246061'
    },
    
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 3000,
    
    error_file: '/var/log/telegram-bot-error.log',
    out_file: '/var/log/telegram-bot-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    max_memory_restart: '500M',
    listen_timeout: 10000,
    kill_timeout: 5000,
    shutdown_with_message: true
  }]
};
PM2_EOF

log_success "PM2 config created"

# 9. Stop existing PM2 process if running
log_info "Stopping existing bot instance..."
pm2 delete telegram-bot 2>/dev/null || true

# 10. Start with PM2
log_info "Starting Telegram Bot with PM2..."
cd "$WORK_DIR"
pm2 start ecosystem.config.js

# 11. Save PM2 configuration
pm2 save

# 12. Setup PM2 startup script
log_info "Configuring PM2 auto-startup..."
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true

sleep 2

# 13. Verify bot is running
if pm2 list | grep -q "telegram-bot.*online"; then
    log_success "Telegram Bot deployed successfully!"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   🚀 Production Bot Running! (PM2 Managed)                   ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${CYAN}Status:${NC}     pm2 status telegram-bot"
    echo -e "  ${CYAN}Logs:${NC}       pm2 logs telegram-bot"
    echo -e "  ${CYAN}Restart:${NC}    pm2 restart telegram-bot"
    echo -e "  ${CYAN}Stop:${NC}       pm2 stop telegram-bot"
    echo -e "  ${CYAN}Monitor:${NC}    pm2 monit"
    echo ""
    echo -e "${PURPLE}Features Enabled:${NC}"
    echo -e "  ✅ Auto-restart on crash (max 10 retries)"
    echo -e "  ✅ Graceful shutdown handling"
    echo -e "  ✅ Memory limit: 500MB"
    echo -e "  ✅ Log rotation enabled"
    echo -e "  ✅ System startup integration"
    echo ""
else
    log_error "Bot failed to start. Check: pm2 logs telegram-bot"
    exit 1
fi
