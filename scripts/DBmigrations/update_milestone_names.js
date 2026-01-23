const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function updateMilestoneNames() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database...');

        const updateQuery = `
            UPDATE invite_milestone_tasks 
            SET name = 'INVITE ' || required_verified_invites
            WHERE is_active = true;
        `;

        const res = await client.query(updateQuery);
        console.log(`Successfully updated ${res.rowCount} milestones.`);

        // Verify Changes
        const verifyRes = await client.query('SELECT name, required_verified_invites FROM invite_milestone_tasks ORDER BY tier_order ASC');
        console.table(verifyRes.rows);

    } catch (err) {
        console.error('Error updating milestone names:', err);
    } finally {
        await client.end();
    }
}

updateMilestoneNames();
