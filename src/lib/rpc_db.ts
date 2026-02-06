import { Pool } from 'pg';

// RPC Security Database Connection
// Used for unbanning IPs directly in the blockchain node's database
// 20.229.0.153 is the internal private IP in Azure VNet

const connectionString = process.env.RPC_DATABASE_URL;

if (!connectionString) {
    console.warn("⚠️ RPC_DATABASE_URL is missing. Unbanning will not work.");
}

export const rpc_pool = new Pool({
    connectionString,
    max: 5, // Keep connections low
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    application_name: 'zug_ui_verifier'
});

export const rpc_query = async (text: string, params?: any[]) => {
    try {
        const start = Date.now();
        const res = await rpc_pool.query(text, params);
        const duration = Date.now() - start;
        console.log('🛡️ RPC DB Executed:', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ RPC_DB_ERROR:', error);
        throw error;
    }
};
