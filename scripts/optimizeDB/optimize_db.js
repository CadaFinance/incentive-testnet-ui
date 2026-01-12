
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    const altPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(altPath)) dotenv.config({ path: altPath });
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function optimizeDatabase() {
    console.log('🚀 Starting Enterprise Database Optimization...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. HIGH-IMPACT INDEXES
        // Speeds up checking if a user has invalid invites
        console.log('📦 Creating Indexes...');

        // Referrals: Finding all invites by a user (Main Dashboard Query)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_referrals_referrer_addr 
            ON referrals(referrer_address);
        `);

        // Referrals: Finding specific referee (Link Verification)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_referrals_referee_addr 
            ON referrals(referee_address);
        `);

        // Audit Log: Checking for specific task completion (e.g. "Did user X do Task Y today?")
        // This is CRITICAL for the daily streak and mission verification logic
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_log_compound 
            ON points_audit_log(address, task_type);
        `);

        // Users: Leaderboard Sorting (Points DESC)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_points_desc 
            ON users(points DESC);
        `);

        // Users: Multiplier Lookups (New Stacking Logic)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_multiplier 
            ON users(multiplier);
        `);


        // 2. MATERIALIZED VIEWS (Snapshot Stats)
        // Replaces the heavy "COUNT(*)" queries on the main dashboard
        console.log('📊 Creating Materialized Views...');

        await client.query(`
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_referral_stats AS
            SELECT 
                referrer_address,
                COUNT(*) as total_referrals,
                SUM(CASE WHEN faucet_bonus_paid THEN 1 ELSE 0 END) as verified_referrals,
                MAX(registered_at) as last_referral_at
            FROM referrals
            GROUP BY referrer_address;
        `);

        // Unique index allows for CONCURRENT refreshes (Non-blocking updates)
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_referral_stats_addr 
            ON mv_referral_stats(referrer_address);
        `);

        console.log('🔄 Refreshing View Data...');
        await client.query('REFRESH MATERIALIZED VIEW mv_referral_stats');


        // 3. VACUUM ANALYZE (Update Stats for Query Planner)
        console.log('🧹 Optimizing Query Planner Statistics...');
        await client.query('ANALYZE VERBOSE users');
        await client.query('ANALYZE VERBOSE referrals');
        await client.query('ANALYZE VERBOSE points_audit_log');

        await client.query('COMMIT');
        console.log('✅ Optimization Complete! Database is now Corporate-Grade.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Optimization Failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

// Export for use as module
module.exports = { optimizeDatabase };

// Run directly if executed as main script
if (require.main === module) {
    optimizeDatabase();
}
