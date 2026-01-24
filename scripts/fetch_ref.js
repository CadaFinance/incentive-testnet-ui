const { Client } = require('pg');

const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';
const ADDRESS = '0x0F4Dc8B3ad7fb88ab6FB37354dD1462cDf25C08c';
const ORIGIN_URL = 'https://testnet.zugchain.org'; // Default, or can be passed as argument

async function fetchReferral() {
    console.log(`Connecting to DB...`);
    const client = new Client({
        connectionString: DATABASE_URL,
        // ssl: { rejectUnauthorized: false } // REMOVED: Server does not support SSL
    });

    try {
        await client.connect();

        const normalizedAddress = ADDRESS.toLowerCase();
        console.log(`Checking referral code for: ${normalizedAddress}`);

        // 1. Check if exists
        const res = await client.query('SELECT code FROM referral_codes WHERE address = $1', [normalizedAddress]);

        if (res.rows.length > 0) {
            const code = res.rows[0].code;
            console.log(`\n----------------------------------------`);
            console.log(`FOUND REFERRAL CODE: ${code}`);
            console.log(`LINK: ${ORIGIN_URL}/?ref=${code}`);
            console.log(`----------------------------------------\n`);
        } else {
            console.log('No referral code found for this address.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fetchReferral();
