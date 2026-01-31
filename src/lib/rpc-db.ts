// RPC Security Database Connection Pool
// Connects to Docker PostgreSQL for RPC security monitoring

import { Pool } from 'pg';

const rpcPool = new Pool({
    host: process.env.RPC_SECURITY_DB_HOST || '127.0.0.1',
    port: Number(process.env.RPC_SECURITY_DB_PORT) || 7433,
    database: process.env.RPC_SECURITY_DB_NAME || 'zugchain_rpc',
    user: process.env.RPC_SECURITY_DB_USER || 'blockscout',
    password: process.env.RPC_SECURITY_DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection on startup
rpcPool.on('error', (err) => {
    console.error('Unexpected error on RPC security database client', err);
});

export default rpcPool;

// Helper function to execute queries
export async function queryRpcDb<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await rpcPool.connect();
    try {
        const result = await client.query(text, params);
        return result.rows;
    } finally {
        client.release();
    }
}

// Helper function for single row queries
export async function queryRpcDbOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await queryRpcDb<T>(text, params);
    return rows[0] || null;
}

// Types
export interface RequestLog {
    id: string;
    ip_address: string;
    request_time: string;
    method: string;
    endpoint: string;
    status_code: number;
    response_time_ms: number;
    user_agent: string;
}

export interface BanEntry {
    ban_type: 'ip' | 'wallet';
    target: string;
    ban_count: number;
    banned_at: string;
    expires_at: string | null; // null = permanent
    ban_status: 'PERMANENT' | 'TEMPORARY';
    reason: string;
}
