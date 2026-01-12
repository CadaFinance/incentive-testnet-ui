const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function maintain() {
    try {
        console.log('🧹 Starting Database Maintenance...');

        console.log('1. Running VACUUM (Recovering storage)...');
        await pool.query('VACUUM');

        console.log('2. Running ANALYZE (Updating query planner statistics)...');
        await pool.query('ANALYZE');

        console.log('✅ Maintenance Complete. Database is optimized.');

    } catch (e) {
        console.error('❌ Maintenance Failed:', e);
    } finally {
        await pool.end();
    }
}

maintain();
