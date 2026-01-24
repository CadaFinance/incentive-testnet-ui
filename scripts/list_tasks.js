const { Client } = require('pg');

const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';

async function listTasks() {
    const client = new Client({ connectionString: DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query('SELECT id, title FROM tasks ORDER BY id ASC');
        console.log('--- EXISTING TASKS ---');
        res.rows.forEach(r => console.log(`[${r.id}] ${r.title}`));
        console.log('----------------------');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

listTasks();
