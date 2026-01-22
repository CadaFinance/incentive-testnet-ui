const { Client } = require('pg');

// Using the provided connection string
const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';

const client = new Client({
    connectionString: DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('🔌 Connected to Database...');

        console.log('🔄 Adding social requirement columns...');

        // Add requires_telegram column
        await client.query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS requires_telegram BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ Added requires_telegram column');

        // Add requires_discord column
        await client.query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS requires_discord BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ Added requires_discord column');

        console.log('🎉 Migration completed successfully!');

    } catch (e) {
        console.error('❌ Migration Error:', e);
    } finally {
        await client.end();
    }
}

run();
