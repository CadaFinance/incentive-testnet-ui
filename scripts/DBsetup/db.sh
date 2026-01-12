#!/bin/bash

# ==============================================================================
# ZugChain Frontend Database Installer (SEPARATE Container)
# ==============================================================================
# This script creates a SEPARATE PostgreSQL container for the frontend,
# running on port 7433 and accessible from external IPs.
# 
# Usage: chmod +x db.sh && sudo ./db.sh
# ==============================================================================

# Configurations
DB_USER="blockscout"
DB_PASSWORD="Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO"
DB_NAME="zug_incentive"
CONTAINER_NAME="frontend-db"
HOST_PORT="7433"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Check if container already exists
log_info "Checking for existing frontend-db container..."

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_info "Container '${CONTAINER_NAME}' already exists. Removing..."
    docker stop ${CONTAINER_NAME} 2>/dev/null
    docker rm ${CONTAINER_NAME} 2>/dev/null
fi

# 2. Create new PostgreSQL container
log_info "Creating new PostgreSQL container: ${CONTAINER_NAME}..."

docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    -e POSTGRES_USER=${DB_USER} \
    -e POSTGRES_PASSWORD=${DB_PASSWORD} \
    -e POSTGRES_DB=${DB_NAME} \
    -p 0.0.0.0:${HOST_PORT}:5432 \
    -v frontend_db_data:/var/lib/postgresql/data \
    postgres:16-alpine

if [ $? -ne 0 ]; then
    log_error "Failed to create container"
    exit 1
fi

log_success "Container created: ${CONTAINER_NAME}"

# 3. Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to be ready..."
sleep 5

for i in {1..30}; do
    if docker exec ${CONTAINER_NAME} pg_isready -U ${DB_USER} -d ${DB_NAME} > /dev/null 2>&1; then
        log_success "PostgreSQL is ready!"
        break
    fi
    echo -n "."
    sleep 1
done

# 4. Create Schema
log_info "Generating schema file..."

cat << 'EOF' > /tmp/schema_temp.sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    address VARCHAR PRIMARY KEY,
    points BIGINT DEFAULT 0,
    total_claims INTEGER DEFAULT 0,
    multiplier NUMERIC DEFAULT 1.0,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    total_referrals INTEGER DEFAULT 0,
    referral_points INTEGER DEFAULT 0,
    referred_by VARCHAR,
    streak_freezes INTEGER DEFAULT 0,
    twitter_id TEXT UNIQUE,
    twitter_username TEXT,
    twitter_image TEXT,
    legacy_claimed BOOLEAN DEFAULT false,
    has_pending_streak_modal BOOLEAN DEFAULT false,
    telegram_id VARCHAR(255) UNIQUE,
    telegram_username VARCHAR(255)
);

-- Table: faucet_history
CREATE TABLE IF NOT EXISTS faucet_history (
    id SERIAL PRIMARY KEY,
    address VARCHAR,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    amount NUMERIC,
    tx_hash VARCHAR
);

-- Table: staking_history
CREATE TABLE IF NOT EXISTS staking_history (
    id SERIAL PRIMARY KEY,
    address VARCHAR NOT NULL,
    tx_hash VARCHAR NOT NULL UNIQUE,
    event_type VARCHAR NOT NULL,
    contract_type VARCHAR NOT NULL,
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    block_number BIGINT,
    harvested_yield DOUBLE PRECISION DEFAULT 0
);

-- Table: points_audit_log
CREATE TABLE IF NOT EXISTS points_audit_log (
    id SERIAL PRIMARY KEY,
    address VARCHAR NOT NULL,
    points_awarded INTEGER NOT NULL,
    task_type VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    tx_hash VARCHAR,
    metadata JSONB
);

-- Composite unique constraint (allows same tx_hash with different task_type)
CREATE UNIQUE INDEX IF NOT EXISTS uk_audit_tx_task ON points_audit_log (tx_hash, task_type);

-- Table: legacy_points
CREATE TABLE IF NOT EXISTS legacy_points (
    twitter_id TEXT PRIMARY KEY,
    total_points INTEGER DEFAULT 0 NOT NULL,
    username TEXT,
    display_name TEXT,
    is_claimed BOOLEAN DEFAULT false,
    claimed_by_address VARCHAR,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: tasks
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    reward_points INTEGER DEFAULT 0 NOT NULL,
    verification_type VARCHAR NOT NULL,
    verification_data TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_daily BOOLEAN DEFAULT false,
    requires_verification BOOLEAN DEFAULT false
);

-- Table: user_task_history
CREATE TABLE IF NOT EXISTS user_task_history (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR NOT NULL,
    task_id INTEGER REFERENCES tasks(id),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    tx_hash VARCHAR,
    UNIQUE(user_address, task_id)
);

-- Table: user_daily_completions
CREATE TABLE IF NOT EXISTS user_daily_completions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR NOT NULL,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    last_completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, task_id)
);

-- Table: daily_streaks
CREATE TABLE IF NOT EXISTS daily_streaks (
    id SERIAL PRIMARY KEY,
    address VARCHAR NOT NULL,
    streak_type VARCHAR NOT NULL,
    current_streak INTEGER DEFAULT 0,
    last_action_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cooldown_start_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(address, streak_type)
);

-- Table: referrals
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_address VARCHAR NOT NULL,
    referee_address VARCHAR NOT NULL UNIQUE,
    referral_code VARCHAR NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    first_faucet_at TIMESTAMPTZ,
    first_zug_stake_at TIMESTAMPTZ,
    first_vzug_stake_at TIMESTAMPTZ,
    faucet_bonus_paid BOOLEAN DEFAULT false,
    zug_stake_bonus_paid BOOLEAN DEFAULT false,
    vzug_stake_bonus_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: referral_codes
CREATE TABLE IF NOT EXISTS referral_codes (
    address VARCHAR PRIMARY KEY,
    code VARCHAR NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: sync_state
CREATE TABLE IF NOT EXISTS sync_state (
    key VARCHAR PRIMARY KEY,
    last_block BIGINT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: telegram_auth_sessions
CREATE TABLE IF NOT EXISTS telegram_auth_sessions (
    id SERIAL PRIMARY KEY,
    code UUID NOT NULL UNIQUE,
    address VARCHAR NOT NULL,
    telegram_id VARCHAR,
    telegram_username VARCHAR,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

-- Table: bot_settings
CREATE TABLE IF NOT EXISTS bot_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT
);

-- Initialize bot settings
INSERT INTO bot_settings (key, value) VALUES ('last_update_id', '0') ON CONFLICT (key) DO NOTHING;

-- Seed Initial Missions (Avoid Duplicates)
INSERT INTO tasks (type, title, description, reward_points, verification_type, verification_data, icon_url, is_active)
SELECT 'SOCIAL', 'Follow on X', 'Stay updated with the latest news by following us on X (Twitter).', 50, 'LINK_CLICK', 'https://x.com/zug_network', '/icons/x-logo.svg', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Follow on X');

INSERT INTO tasks (type, title, description, reward_points, verification_type, verification_data, icon_url, is_active)
SELECT 'SOCIAL', 'Join Discord Community', 'Join our vibrant community on Discord to discuss and collaborate.', 50, 'LINK_CLICK', 'https://discord.gg/zug', '/icons/discord-logo.svg', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Join Discord Community');

-- ==============================================================================
-- PRESALE SETTINGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS presale_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    goal_amount NUMERIC DEFAULT 4202850.00,
    countdown_end_date TIMESTAMPTZ DEFAULT '2026-01-05T23:59:59Z',
    current_price NUMERIC DEFAULT 0.00048,
    next_price NUMERIC DEFAULT 0.00096,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Presale Data (Upsert)
INSERT INTO presale_settings (id, goal_amount, countdown_end_date, current_price, next_price)
VALUES (1, 4202850.00, '2026-01-05T23:59:59Z', 0.00048, 0.00096)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_addr ON referrals(referrer_address);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_addr ON referrals(referee_address);
CREATE INDEX IF NOT EXISTS idx_audit_log_compound ON points_audit_log(address, task_type);
CREATE INDEX IF NOT EXISTS idx_users_points_desc ON users(points DESC);
CREATE INDEX IF NOT EXISTS idx_users_multiplier ON users(multiplier);
CREATE INDEX IF NOT EXISTS idx_staking_history_address ON staking_history(address);
CREATE INDEX IF NOT EXISTS idx_staking_history_contract ON staking_history(contract_type);

-- ==============================================================================
-- MATERIALIZED VIEWS
-- ==============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_view AS
SELECT address, points, total_claims, row_number() OVER (ORDER BY points DESC, last_active) AS rank
FROM users;
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_address_idx ON leaderboard_view (address);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_referral_stats AS
SELECT 
    referrer_address,
    COUNT(*) as total_referrals,
    SUM(CASE WHEN faucet_bonus_paid THEN 1 ELSE 0 END) as verified_referrals,
    MAX(registered_at) as last_referral_at
FROM referrals
GROUP BY referrer_address;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_referral_stats_addr ON mv_referral_stats(referrer_address);

CREATE OR REPLACE FUNCTION refresh_leaderboard() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;
EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW leaderboard_view;
END;
$$ LANGUAGE plpgsql;

EOF

# 5. Copy Schema to Container and Execute
log_info "Uploading schema to container..."
docker cp /tmp/schema_temp.sql ${CONTAINER_NAME}:/tmp/schema.sql

log_info "Executing schema import..."
docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -f /tmp/schema.sql

if [ $? -eq 0 ]; then
    log_success "Schema imported successfully!"
else
    log_error "Schema import failed."
    rm /tmp/schema_temp.sql
    exit 1
fi

# Cleanup
rm /tmp/schema_temp.sql

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Frontend Database Setup Complete!                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Container:${NC}  ${CONTAINER_NAME}"
echo -e "  ${CYAN}Port:${NC}       ${HOST_PORT} (accessible from 0.0.0.0)"
echo -e "  ${CYAN}Database:${NC}   ${DB_NAME}"
echo -e "  ${CYAN}User:${NC}       ${DB_USER}"
echo ""
echo -e "  ${CYAN}Connection URL:${NC}"
echo -e "  postgres://${DB_USER}:${DB_PASSWORD}@<YOUR_IP>:${HOST_PORT}/${DB_NAME}"
echo ""
log_info "Don't forget to open Port ${HOST_PORT} in AWS Security Group!"
log_success "Setup Complete!"
