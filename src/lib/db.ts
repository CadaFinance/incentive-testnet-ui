import { Pool } from 'pg';

// Institutional Grade: Dynamic connection string (no fallback - must be set in .env)
const connectionString = process.env.DATABASE_URL!;

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
    pool = new Pool({
        connectionString,
        max: 350,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
} else {
    // In development, use a global variable so existing pool is not lost on HMR
    if (!(global as any).postgres) {
        (global as any).postgres = new Pool({
            connectionString,
            max: 350,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    }
    pool = (global as any).postgres;
}

// Error handling for the pool
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});


export const query = async (text: string, params?: any[]) => {
    try {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('DATABASE_QUERY_ERROR:', error);
        throw error;
    }
};

export const db = {
    query,
    pool
};

