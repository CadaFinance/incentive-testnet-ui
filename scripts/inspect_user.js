const { Client } = require('pg');
const fs = require('fs');

// User provided connection string
const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';
const TARGET_ADDRESS = '0xC2350E5E6ccD85A33d42E810CF5BeFaba87FCDFb';

const client = new Client({
    connectionString: DATABASE_URL,
    // ssl: false // Disable SSL explicit
});

async function run() {
    try {
        await client.connect();
        console.log('🔌 Connected to Database...');

        const res = await client.query(`
            SELECT 
                address,
                twitter_id, twitter_username, twitter_image,
                telegram_id, telegram_username,
                discord_id, discord_username, discord_image
            FROM users 
            WHERE address = $1
        `, [TARGET_ADDRESS.toLowerCase()]);

        if (res.rows.length === 0) {
            console.error('❌ User NOT found with address:', TARGET_ADDRESS);
        } else {
            const user = res.rows[0];
            console.log('✅ USER FOUND:');
            console.log('--------------------------------------------------');
            console.log('Address  :', user.address);
            console.log('Twitter  :', user.twitter_username || 'null', `(ID: ${user.twitter_id || 'null'})`);
            console.log('Telegram :', user.telegram_username || 'null', `(ID: ${user.telegram_id || 'null'})`);
            console.log('Discord  :', user.discord_username || 'null', `(ID: ${user.discord_id || 'null'})`);
            console.log('--------------------------------------------------');

            const filename = `backup_${TARGET_ADDRESS.substring(0, 8)}.json`;
            fs.writeFileSync(filename, JSON.stringify(res.rows[0], null, 2));
            console.log(`💾 Backup saved to: ${filename}`);
            console.log(`\nReview the data above. If this is the correct user, we can proceed to wipe.`);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
