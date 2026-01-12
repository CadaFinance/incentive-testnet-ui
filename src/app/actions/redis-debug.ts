'use server';

import { redis } from '@/lib/redis';

export async function checkRedisStatus() {
    try {
        const start = Date.now();
        const pong = await redis.ping();
        const latency = Date.now() - start;

        // Also check a test key
        await redis.set('debug:test', 'working', 'EX', 10);
        const val = await redis.get('debug:test');

        return {
            connected: pong === 'PONG' && val === 'working',
            latency,
            host: process.env.REDIS_URL ? 'Remote/Configured' : 'Localhost (Default)',
            error: null
        };
    } catch (error: any) {
        return {
            connected: false,
            latency: 0,
            host: 'Error',
            error: error.message
        };
    }
}
