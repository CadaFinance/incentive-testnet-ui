const { Client } = require('pg');
const fs = require('fs');

const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';
const BADGE_ID = 'INSTITUTIONAL_STAKER';
const OUTPUT_FILE = 'institutional_stakers.csv';

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: false
});

async function main() {
    console.log(`\n=== EXPORTING BADGE HOLDERS: ${BADGE_ID} ===`);

    try {
        await client.connect();

        // Query users who have this badge in their JSONB array
        const query = `
            SELECT address, points, badges, vzug_staked, zug_staked 
            FROM users 
            WHERE badges @> $1
        `;

        // The value to check containment for must be valid JSON
        const values = [JSON.stringify([BADGE_ID])];

        const res = await client.query(query, values);
        console.log(`Found ${res.rowCount} users with badge: ${BADGE_ID}`);

        if (res.rowCount > 0) {
            // Create CSV
            const headers = "Address,Points,vZUG_Staked,ZUG_Staked,Badges";
            const rows = res.rows.map(r => {
                // Escape quotes in badges JSON if needed, though for CSV usually just quoting the field is enough
                // But simplified: just take the address and stats.
                const badgesStr = JSON.stringify(r.badges).replace(/"/g, '""'); // CSV escape
                return `${r.address},${r.points},${r.vzug_staked},${r.zug_staked},"${badgesStr}"`;
            });

            const csvContent = [headers, ...rows].join('\n');
            fs.writeFileSync(OUTPUT_FILE, csvContent);
            console.log(`[SUCCESS] Saved to ${OUTPUT_FILE}`);

            // Console preview
            console.table(res.rows.map(r => ({
                Address: r.address,
                Points: r.points,
                vZUG: r.vzug_staked
            })));
        } else {
            console.log("No users found with this badge.");
        }

    } catch (err) {
        console.error("Error executing query:", err);
    } finally {
        await client.end();
    }
}

main();
