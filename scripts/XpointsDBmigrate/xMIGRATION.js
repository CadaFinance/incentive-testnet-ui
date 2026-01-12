
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrateLegacyData() {
    console.log("🚀 Starting Legacy Data Migration...");
    const client = await pool.connect();

    try {
        // 1. Create Table
        console.log("🛠️  Ensuring table 'legacy_points' exists...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.legacy_points (
                twitter_id TEXT PRIMARY KEY,
                total_points INTEGER NOT NULL DEFAULT 0,
                username TEXT,
                display_name TEXT,
                is_claimed BOOLEAN DEFAULT FALSE,
                claimed_by_address VARCHAR(255),
                claimed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
            );
        `);
        console.log("✅ Table ready.");

        // 2. Load Data
        const snapshotPath = path.join(__dirname, '../../../welcome-app/legacy_snapshot.json');
        if (!fs.existsSync(snapshotPath)) {
            throw new Error(`Snapshot file not found at: ${snapshotPath}`);
        }

        const rawData = fs.readFileSync(snapshotPath, 'utf8');
        const users = JSON.parse(rawData);
        console.log(`📥 Loaded ${users.length} records from snapshot.`);

        // 3. Batch Insert
        const BATCH_SIZE = 1000;
        console.log(`⚡ Inserting records (Batch Size: ${BATCH_SIZE})...`);

        await client.query('BEGIN'); // Start Transaction

        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);

            const values = [];
            const placeholders = [];
            let paramIndex = 1;

            batch.forEach(user => {
                values.push(user.twitter_id, user.total_points, user.username || null, user.display_name || null);
                placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
                paramIndex += 4;
            });

            const query = `
                INSERT INTO public.legacy_points (twitter_id, total_points, username, display_name)
                VALUES ${placeholders.join(', ')}
                ON CONFLICT (twitter_id) DO UPDATE 
                SET total_points = EXCLUDED.total_points,
                    username = EXCLUDED.username,
                    display_name = EXCLUDED.display_name;
            `;

            await client.query(query, values);
            console.log(`   Processed rows ${i + 1} to ${Math.min(i + BATCH_SIZE, users.length)}...`);
        }

        await client.query('COMMIT'); // Commit Transaction
        console.log("🎉 Migration Complete! All records inserted.");

        // 4. Verification Count
        const countRes = await client.query('SELECT COUNT(*) FROM public.legacy_points');
        console.log(`📊 Total rows in 'legacy_points': ${countRes.rows[0].count}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

// Export for use as module
module.exports = { migrateLegacyData };

// Run directly if executed as main script
if (require.main === module) {
    migrateLegacyData();
}
