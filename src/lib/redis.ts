import Redis from 'ioredis';

// --- INSTITUTIONAL REDIS CONFIG ---
// Safe singleton pattern for Next.js hot-reloading
const globalForRedis = global as unknown as { redis: Redis | undefined };

const REDIS_URL = process.env.REDIS_URL!;

const createRedisClient = () => {
    const client = new Redis(REDIS_URL, {
        family: 4,             // Force IPv4 (Crucial for remote connections)
        connectTimeout: 10000, // 10s timeout
        keepAlive: 30000,      // Keep connection alive
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            return Math.min(times * 100, 3000);
        },
        connectionName: 'mission_control_client',
        lazyConnect: true,
    });

    // Debug Events
    client.on('error', (e) => console.error('[Redis Error]', e.message));
    client.on('connect', () => console.log('[Redis] Connected 🟢'));

    return client;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

/**
 * Enterprise Caching Wrapper (Cache-Aside Pattern)
 * @param key Redis Key
 * @param fetcher Async function to get data from DB if cache miss
 * @param ttlSeconds Time to Live in seconds
 * @returns Data (T)
 */
export async function getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    // 1. Try Cache (Fail safely if Redis is down)
    try {
        if (redis.status === 'ready') {
            const cached = await redis.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
        }
    } catch (e) {
        // console.warn(`Redis Cache Error for ${key}`, e);
    }

    // 2. Fallback to DB
    const data = await fetcher();

    // 3. Write to Cache (Fire & Forget with Error Handling)
    if (data && redis.status === 'ready') {
        redis.set(key, JSON.stringify(data), 'EX', ttlSeconds).catch(e => {
            console.error(`[Redis Background Write Failed] ${key}`, e.message);
        });
    }

    return data;
}

/**
 * Invalidates cache for a specific key pattern
 * @param key Exact key to delete
 */
export async function invalidateCache(key: string) {
    try {
        await redis.del(key);
    } catch (e) {
        console.error(`Failed to invalidate cache: ${key}`);
    }
}
