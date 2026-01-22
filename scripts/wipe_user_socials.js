const { Client } = require('pg');

const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';
const TARGET_ADDRESS = '0x4B16eB109f8D980DDcc6Fd493859A11f0bb0c778';

const client = new Client({
    connectionString: DATABASE_URL,
    // ssl: false
});

async function run() {
    try {
        await client.connect();
        console.log('🔌 Connected to Database...');

        console.log(`🗑️ Wiping social data for: ${TARGET_ADDRESS}...`);

        const res = await client.query(`
            UPDATE users 
            SET 
                twitter_id = NULL, twitter_username = NULL, twitter_image = NULL,
                telegram_id = NULL, telegram_username = NULL,
                discord_id = NULL, discord_username = NULL, discord_image = NULL
            WHERE address = $1
            RETURNING address
        `, [TARGET_ADDRESS.toLowerCase()]);

        if (res.rowCount === 0) {
            console.error('❌ User NOT found. Nothing updated.');
        } else {
            console.log('✅ SUCCESS: Social data wiped.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
