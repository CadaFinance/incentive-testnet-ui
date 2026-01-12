import { Queue } from 'bullmq';
import { redis } from './redis'; // Reuse existing robust connection logic?
// BullMQ requires a specific connection format or an ioredis instance.
// Since we have a singleton 'redis' from ./redis, we can try to reuse it OR create a dedicated connection for the Queue.
// BullMQ best practice is dedicated connections (blocking).

import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL!;

// Factory for Queue Connection
const createConnection = () => {
    return new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null, // Required by BullMQ
        family: 4,                  // Force IPv4
        connectTimeout: 10000,
        retryStrategy(times) {
            return Math.min(times * 100, 3000);
        }
    });
};

// Singleton Queue Instance (avoid spawning multiple in Serverless)
// Note: In Next.js Serverless, this might re-init often, which is fine for producers.
let incentiveQueue: Queue | null = null;

export const getQueue = () => {
    if (!incentiveQueue) {
        incentiveQueue = new Queue('IncentiveQueue', {
            connection: createConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true, // Keep Redis clean
                removeOnFail: 100 // Keep last 100 failed for debugging
            }
        });
    }
    return incentiveQueue;
};

export type JobType = 'STAKE_SYNC' | 'FAUCET_CLAIM';

export async function addJob(type: JobType, data: any) {
    const q = getQueue();
    // Job ID is deterministic if provided, otherwise random.
    // For transactions, we can use txHash as Job ID to prevent duplicates!
    const jobId = data.txHash || undefined;

    await q.add(type, { type, data }, { jobId });
}
