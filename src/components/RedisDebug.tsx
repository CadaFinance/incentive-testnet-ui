'use client';

import { useState, useEffect } from 'react';
import { checkRedisStatus } from '@/app/actions/redis-debug';
import { motion } from 'framer-motion';

export function RedisDebug() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const check = async () => {
            const res = await checkRedisStatus();
            setStatus(res);
            setLoading(false);
        };

        check();
        const interval = setInterval(check, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`fixed bottom-4 right-4 p-4 rounded-lg border backdrop-blur-md shadow-2xl z-50 font-mono text-xs
                ${status?.connected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}
            `}
        >
            <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="font-bold uppercase tracking-wider">Redis Status</span>
            </div>

            {status?.connected ? (
                <div>
                    <div>Lat: {status.latency}ms</div>
                    <div className="opacity-70">Mode: {status.host}</div>
                </div>
            ) : (
                <div>
                    <div>Disconnected</div>
                    <div className="opacity-70 max-w-[200px] truncate">{status?.error}</div>
                </div>
            )}
        </motion.div>
    );
}
