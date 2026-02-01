require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const config = {
    host: process.env.RPC_SECURITY_DB_HOST,
    port: Number(process.env.RPC_SECURITY_DB_PORT),
    database: process.env.RPC_SECURITY_DB_NAME,
    user: process.env.RPC_SECURITY_DB_USER,
    password: process.env.RPC_SECURITY_DB_PASSWORD,
    connectionTimeoutMillis: 5000,
};

console.log('Testing connection to:', config.host, config.port, config.database);

const client = new Client(config);

client.connect()
    .then(() => {
        console.log('✅ Connected successfully!');
        return client.query('SELECT NOW()');
    })
    .then(res => {
        console.log('Query result:', res.rows[0]);
        return client.query('SELECT count(*) FROM rpc_security.request_log');
    })
    .then(res => {
        console.log('Log count:', res.rows[0]);
        client.end();
    })
    .catch(err => {
        console.error('❌ Connection failed:', err);
        client.end();
    });
