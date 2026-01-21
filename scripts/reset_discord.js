const { Client } = require('pg');

const connectionString = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';

const client = new Client({
    connectionString,
    ssl: false
});

async function resetDiscord() {
    try {
        await client.connect();
        console.log('Connected. Resetting Discord columns for ALL users...');

        await client.query(`
      UPDATE users 
      SET discord_id = NULL, 
          discord_username = NULL, 
          discord_image = NULL;
    `);

        console.log('✅ Discord data wiped from DB. You can now re-test verification.');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

resetDiscord();
