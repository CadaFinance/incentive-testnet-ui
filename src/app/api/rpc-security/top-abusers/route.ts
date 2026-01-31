import { NextRequest, NextResponse } from 'next/server';
import { queryRpcDb } from '@/lib/rpc-db';

interface TopAbuser {
    ip_address: string;
    total_requests: number;
    blocked_requests: number;
    error_requests: number;
    last_seen: string;
}

export async function GET(req: NextRequest) {
    try {
        // Find top IPs in the last 10 minutes
        const topIps = await queryRpcDb<TopAbuser>(`
            SELECT 
                ip_address,
                COUNT(*) as total_requests,
                SUM(CASE WHEN status_code IN (403, 429) THEN 1 ELSE 0 END) as blocked_requests,
                SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as error_requests,
                MAX(request_time) as last_seen
            FROM rpc_security.request_log
            WHERE request_time > NOW() - INTERVAL '10 minutes'
            GROUP BY ip_address
            ORDER BY total_requests DESC
            LIMIT 20
        `);

        return NextResponse.json(topIps);
    } catch (error: any) {
        console.error('[Top Abusers API Error]', error);
        return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
    }
}
