const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function inspectDb() {
    const client = await pool.connect();
    try {
        console.log("🔍 Starting Database Inspection...");

        // 1. Get all tables in public schema
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);

        const schema = {};

        for (const row of tablesRes.rows) {
            const tableName = row.table_name;
            console.log(`Analyzing table: ${tableName}...`);

            // 2. Get columns for each table
            const columnsRes = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            `, [tableName]);

            // 3. Get Constraints (Primary Keys, Uniques)
            const constraintsRes = await client.query(`
                SELECT
                    tc.constraint_name, 
                    tc.constraint_type,
                    kcu.column_name
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                WHERE tc.table_name = $1;
            `, [tableName]);

            schema[tableName] = {
                columns: columnsRes.rows,
                constraints: constraintsRes.rows
            };
        }

        // 4. Get Materialized Views
        const viewsRes = await client.query(`
            SELECT matviewname as view_name
            FROM pg_matviews
            WHERE schemaname = 'public';
        `);

        schema['_materialized_views'] = viewsRes.rows;

        // 5. Save to JSON
        const outputPath = path.join(__dirname, 'db_schema.json');
        fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

        console.log(`✅ Inspection Complete! Schema saved to: ${outputPath}`);

    } catch (err) {
        console.error("❌ Inspection Failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectDb();
