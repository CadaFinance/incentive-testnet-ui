const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Import other scripts to run after reset
const { migrateLegacyData } = require('../XpointsDBmigrate/xMIGRATION');
const { optimizeDatabase } = require('../optimizeDB/optimize_db');

const DB_URL = process.env.DATABASE_URL;

async function resetDatabase() {
    console.log('🔌 Connecting to:', DB_URL.replace(/:[^:@]+@/, ':****@'));
    const client = new Client({ connectionString: DB_URL });

    try {
        await client.connect();
        console.log('✅ Connected successfully\n');

        // ===================================
        // 1. DROP EVERYTHING
        // ===================================
        console.log('🗑️  === DROPPING ALL TABLES & VIEWS ===');
        await client.query('BEGIN');

        // Disable triggers to speed up and avoid deps
        await client.query(`SET session_replication_role = 'replica';`);

        // Drop Materialized Views
        await client.query(`DROP MATERIALIZED VIEW IF EXISTS leaderboard_view CASCADE;`);
        await client.query(`DROP MATERIALIZED VIEW IF EXISTS mv_referral_stats CASCADE;`);

        // Drop Tables
        const tables = [
            'users', 'user_daily_completions', 'referral_codes', 'telegram_outbox',
            'faucet_history', 'staking_history', 'legacy_points', 'tasks',
            'user_task_history', 'points_audit_log', 'daily_streaks', 'referrals',
            'sync_state', 'telegram_auth_sessions', 'bot_settings'
        ];

        for (const t of tables) {
            await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
            console.log(`  Dropped ${t}`);
        }

        await client.query(`SET session_replication_role = 'origin';`);
        await client.query('COMMIT');
        console.log('✅ All objects dropped\n');


        // ===================================
        // 2. CREATE SCHEMA (From db.sh)
        // ===================================
        console.log('🏗️  === CREATING CORE SCHEMA (from db.sh) ===');
        await client.query('BEGIN');

        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        // --- users ---
        await client.query(`
            CREATE TABLE users (
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
        `);
        console.log('  Created users');

        // --- tasks ---
        await client.query(`
            CREATE TABLE tasks (
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
        `);
        console.log('  Created tasks');

        // --- faucet_history ---
        await client.query(`
            CREATE TABLE faucet_history (
                id SERIAL PRIMARY KEY,
                address VARCHAR,
                claimed_at TIMESTAMPTZ DEFAULT NOW(),
                amount NUMERIC,
                tx_hash VARCHAR
            );
        `);
        console.log('  Created faucet_history');

        // --- staking_history ---
        await client.query(`
            CREATE TABLE staking_history (
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
        `);
        console.log('  Created staking_history');

        // --- points_audit_log ---
        await client.query(`
            CREATE TABLE points_audit_log (
                id SERIAL PRIMARY KEY,
                address VARCHAR NOT NULL,
                points_awarded INTEGER NOT NULL,
                task_type VARCHAR NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                tx_hash VARCHAR,
                metadata JSONB
            );
            CREATE UNIQUE INDEX uk_audit_tx_task ON points_audit_log (tx_hash, task_type);
        `);
        console.log('  Created points_audit_log');

        // --- legacy_points ---
        await client.query(`
            CREATE TABLE legacy_points (
                twitter_id TEXT PRIMARY KEY,
                total_points INTEGER DEFAULT 0 NOT NULL,
                username TEXT,
                display_name TEXT,
                is_claimed BOOLEAN DEFAULT false,
                claimed_by_address VARCHAR,
                claimed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('  Created legacy_points');

        // --- user_task_history ---
        await client.query(`
            CREATE TABLE user_task_history (
                id SERIAL PRIMARY KEY,
                user_address VARCHAR NOT NULL,
                task_id INTEGER REFERENCES tasks(id),
                completed_at TIMESTAMPTZ DEFAULT NOW(),
                tx_hash VARCHAR,
                UNIQUE(user_address, task_id)
            );
        `);
        console.log('  Created user_task_history');

        // --- user_daily_completions ---
        await client.query(`
            CREATE TABLE user_daily_completions (
                id SERIAL PRIMARY KEY,
                user_address VARCHAR NOT NULL,
                task_id INTEGER NOT NULL REFERENCES tasks(id),
                last_completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_address, task_id)
            );
        `);
        console.log('  Created user_daily_completions');

        // --- daily_streaks ---
        await client.query(`
            CREATE TABLE daily_streaks (
                id SERIAL PRIMARY KEY,
                address VARCHAR NOT NULL,
                streak_type VARCHAR NOT NULL,
                current_streak INTEGER DEFAULT 0,
                last_action_date DATE,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                cooldown_start_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(address, streak_type)
            );
        `);
        console.log('  Created daily_streaks');

        // --- referrals ---
        await client.query(`
            CREATE TABLE referrals (
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
        `);
        console.log('  Created referrals');

        // --- referral_codes ---
        await client.query(`
            CREATE TABLE referral_codes (
                address VARCHAR PRIMARY KEY,
                code VARCHAR NOT NULL UNIQUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  Created referral_codes');

        // --- sync_state ---
        await client.query(`
            CREATE TABLE sync_state (
                key VARCHAR PRIMARY KEY,
                last_block BIGINT NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  Created sync_state');

        // --- telegram_auth_sessions ---
        await client.query(`
            CREATE TABLE telegram_auth_sessions (
                id SERIAL PRIMARY KEY,
                code UUID NOT NULL UNIQUE,
                address VARCHAR NOT NULL,
                telegram_id VARCHAR,
                telegram_username VARCHAR,
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMPTZ
            );
        `);
        console.log('  Created telegram_auth_sessions');

        // --- bot_settings ---
        await client.query(`
            CREATE TABLE bot_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT
            );
        `);
        console.log('  Created bot_settings');

        await client.query('COMMIT');
        console.log('✅ Core Schema created');

        // ===================================
        // 3. CREATE BOT SCHEMA (from telegram_bot.sh)
        // ===================================
        console.log('🤖 === CREATING BOT SCHEMA (from telegram_bot.sh) ===');
        await client.query('BEGIN');

        // --- telegram_outbox ---
        await client.query(`
            CREATE TABLE telegram_outbox (
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
        console.log('  Created telegram_outbox');

        // --- Queue Notification Trigger ---
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
        console.log('  Created notification triggers on users');

        // --- Worker Notification System ---
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
        console.log('  Created notify_worker system');

        await client.query('COMMIT');
        console.log('✅ Bot Schema created');


        // ===================================
        // 4. PERFORMANCE & VIEWS (from db.sh)
        // ===================================
        console.log('🚀 === CREATING INDEXES & VIEWS ===');
        await client.query('BEGIN');

        await client.query(`
            CREATE INDEX idx_referrals_referrer_addr ON referrals(referrer_address);
            CREATE INDEX idx_referrals_referee_addr ON referrals(referee_address);
            CREATE INDEX idx_audit_log_compound ON points_audit_log(address, task_type);
            CREATE INDEX idx_users_points_desc ON users(points DESC);
            CREATE INDEX idx_users_multiplier ON users(multiplier);
            CREATE INDEX idx_staking_history_address ON staking_history(address);
            CREATE INDEX idx_staking_history_contract ON staking_history(contract_type);
        `);

        // Materialized Views
        await client.query(`
            CREATE MATERIALIZED VIEW leaderboard_view AS
            SELECT address, points, total_claims, row_number() OVER (ORDER BY points DESC, last_active) AS rank
            FROM users;
            CREATE UNIQUE INDEX leaderboard_address_idx ON leaderboard_view (address);
        `);

        await client.query(`
            CREATE MATERIALIZED VIEW mv_referral_stats AS
            SELECT 
                referrer_address,
                COUNT(*) as total_referrals,
                SUM(CASE WHEN faucet_bonus_paid THEN 1 ELSE 0 END) as verified_referrals,
                MAX(registered_at) as last_referral_at
            FROM referrals
            GROUP BY referrer_address;
            CREATE UNIQUE INDEX idx_mv_referral_stats_addr ON mv_referral_stats(referrer_address);
        `);

        await client.query(`
            CREATE OR REPLACE FUNCTION refresh_leaderboard() RETURNS void AS $$
            BEGIN
                REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;
            EXCEPTION WHEN OTHERS THEN
                REFRESH MATERIALIZED VIEW leaderboard_view;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await client.query('COMMIT');
        console.log('✅ Indexes and Views created');


        // ===================================
        // 5. SEED DATA
        // ===================================
        console.log('🌱 === SEEDING DATA ===');
        await client.query('BEGIN');

        // Seed Bot Key
        await client.query(`INSERT INTO bot_settings (key, value) VALUES ('last_update_id', '0') ON CONFLICT (key) DO NOTHING`);

        // Seed Tasks
        const missions = [
            {
                type: 'SOCIAL',
                title: 'Follow on X',
                description: 'Stay updated with the latest news by following us on X (Twitter).',
                reward_points: 50,
                verification_type: 'LINK_CLICK',
                verification_data: 'https://x.com/zug_network',
                icon_url: '/icons/x-logo.svg'
            },
            {
                type: 'SOCIAL',
                title: 'Join Discord Community',
                description: 'Join our vibrant community on Discord to discuss and collaborate.',
                reward_points: 50,
                verification_type: 'LINK_CLICK',
                verification_data: 'https://discord.gg/zug',
                icon_url: '/icons/discord-logo.svg'
            }
        ];

        for (const m of missions) {
            await client.query(
                `INSERT INTO tasks (type, title, description, reward_points, verification_type, verification_data, icon_url, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
                [m.type, m.title, m.description, m.reward_points, m.verification_type, m.verification_data, m.icon_url]
            );
        }

        await client.query('COMMIT');
        console.log('✅ Default data seeded');

        console.log('\n🎉 === FULL RESET COMPLETE ===');

        // Run additional scripts after reset
        console.log('\n🔄 === RUNNING POST-RESET SCRIPTS ===');
        await client.end();

        console.log('\n📦 Running xMIGRATION.js...');
        await migrateLegacyData();

        console.log('\n⚡ Running optimize_db.js...');
        await optimizeDatabase();

        console.log('\n✅ === ALL SCRIPTS COMPLETED SUCCESSFULLY ===');
        return;

    } catch (err) {
        console.error('\n❌ ERROR:', err.message);
        if (err.stack) console.error(err.stack);
        try { await client.query('ROLLBACK'); } catch (rErr) { }
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Export for use as module
module.exports = { resetDatabase };

// Run directly if executed as main script
if (require.main === module) {
    resetDatabase();
}
