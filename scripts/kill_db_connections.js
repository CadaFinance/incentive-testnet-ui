const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Vercel/Neon usually requires SSL
});

async function run() {
    try {
        await client.connect();
        console.log('🔌 Connected to Database...');

        const dbName = client.database;
        console.log(`🔫 Terminating idle connections for database: ${dbName}...`);

        // Query to terminate all other connections to this database
        const res = await client.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1
            AND pid <> pg_backend_pid()
            AND state = 'idle';
        `, [dbName]);

        console.log(`✅ Terminated ${res.rowCount} idle connections.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
