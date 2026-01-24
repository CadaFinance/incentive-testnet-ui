const { Client } = require('pg');
const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';

async function run() {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
        const query = `
            INSERT INTO tasks (id, type, title, description, reward_points, verification_type, verification_data, icon_url, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = $3, description = $4, reward_points = $5, verification_data = $7, is_active = $9
        `;
        const values = [
            14,
            'SOCIAL',
            'Reply & Boost',
            'Reply to the official Twitter post with your referral link.',
            150,
            'LINK_CLICK',
            'TWITTER_INTENT_REPLY:2014790272585027620',
            'https://abs.twimg.com/favicons/twitter.2.ico',
            true
        ];

        await client.query(query, values);
        console.log('Mission 14 inserted/updated successfully.');
    } catch (e) { console.error(e); }
    finally { await client.end(); }
}
run();
