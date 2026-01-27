const { Client } = require('pg');

const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';
const TARGET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 10000,
});

async function run() {
    try {
        await client.connect();
        console.log('🔌 Connected.');

        const address = TARGET_ADDRESS.toLowerCase();
        console.log(`🗑️ Wiping social fields for: ${address}`);

        await client.query(`
            UPDATE users SET 
                points = 0,
                twitter_id = NULL, twitter_username = NULL, twitter_image = NULL,
                telegram_id = NULL, telegram_username = NULL,
                discord_id = NULL, discord_username = NULL, discord_image = NULL
            WHERE address = $1
        `, [address]);

        console.log('🗑️ Wiping task history for social missions...');
        await client.query(`
            DELETE FROM user_task_history 
            WHERE user_address = $1 
            AND task_id IN (-100, -101, -102, -103)
        `, [address]);

        console.log('✅ Success.');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}

run();
