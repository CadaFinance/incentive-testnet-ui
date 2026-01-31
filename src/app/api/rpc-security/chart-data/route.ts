import { NextRequest, NextResponse } from 'next/server';
import { queryRpcDb } from '@/lib/rpc-db';

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS?.toLowerCase();

function isAdmin(address?: string) {
    if (!address || !ADMIN_ADDRESS) return false;
    return address.toLowerCase() === ADMIN_ADDRESS;
}

export async function GET(req: NextRequest) {
    try {
        const walletAddress = req.headers.get('x-wallet-address');

        if (!isAdmin(walletAddress || '')) {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access only' },
                { status: 403 }
            );
        }

        // Real-time chart data (last 60 seconds, grouped by second)
        const realtimeData = await queryRpcDb<{ time_bucket: string; req_count: number }>(`
      SELECT 
        date_trunc('second', request_time) as time_bucket,
        COUNT(*) as req_count
      FROM rpc_security.request_log
      WHERE request_time > NOW() - INTERVAL '60 seconds'
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `);

        // Generate full 60-second timeline (fill gaps with 0)
        const now = new Date();
        const realtime = [];
        for (let i = 59; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 1000);
            const timeStr = time.toISOString().split('.')[0] + 'Z';
            const dataPoint = realtimeData.find(d => d.time_bucket === timeStr);
            realtime.push({
                time: timeStr,
                reqPerSec: parseInt(dataPoint?.req_count?.toString() || '0'),
            });
        }

        // Ban history (last 30 days, grouped by day)
        const banHistoryData = await queryRpcDb<{ date: string; ip_bans: number; wallet_bans: number }>(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN ban_type = 'ip' AND action = 'ban' THEN 1 ELSE 0 END) as ip_bans,
        SUM(CASE WHEN ban_type = 'wallet' AND action = 'ban' THEN 1 ELSE 0 END) as wallet_bans
      FROM rpc_security.ban_history
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

        return NextResponse.json({
            realtime,
            banHistory: banHistoryData,
        });
    } catch (error: any) {
        console.error('[RPC Security Chart Data API Error]', error);
        return NextResponse.json(
            { error: 'Failed to fetch chart data', details: error.message },
            { status: 500 }
        );
    }
}
