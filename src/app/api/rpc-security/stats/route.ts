import { NextRequest, NextResponse } from 'next/server';
import { queryRpcDb } from '@/lib/rpc-db';

const ADMIN_ADDRESS = (process.env.ADMIN_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_ADDRESS)?.toLowerCase();

// Helper to check admin access
function isAdmin(address?: string) {
    if (!address || !ADMIN_ADDRESS) return false;
    return address.toLowerCase() === ADMIN_ADDRESS;
}

export async function GET(req: NextRequest) {
    try {
        // Get wallet address from header (set by wallet connect)
        const walletAddress = req.headers.get('x-wallet-address');

        // Admin check
        console.log('[API Debug] Headers:', Object.fromEntries(req.headers));
        console.log('[API Debug] Wallet Address from Header:', walletAddress);
        console.log('[API Debug] Configured Admin Address:', ADMIN_ADDRESS);

        if (!isAdmin(walletAddress || '')) {
            console.log('[API Debug] Auth Failed');
            return NextResponse.json(
                { error: 'Unauthorized: Admin access only', received: walletAddress, expected: ADMIN_ADDRESS },
                { status: 403 }
            );
        }

        // Fetch active bans count
        const activeBansResult = await queryRpcDb<{ total: string | number; ip_count: string | number; wallet_count: string | number }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ban_type = 'ip' THEN 1 ELSE 0 END) as ip_count,
        SUM(CASE WHEN ban_type = 'wallet' THEN 1 ELSE 0 END) as wallet_count
      FROM rpc_security.active_bans
    `);

        // Fetch request stats (last 5 minutes)
        const requestStatsResult = await queryRpcDb<{ count: string | number }>(`
      SELECT COUNT(*) as count
      FROM rpc_security.request_log
      WHERE request_time > NOW() - INTERVAL '5 minutes'
    `);

        // Calculate current rate (requests per second in last 10 seconds)
        const currentRateResult = await queryRpcDb<{ rate: number }>(`
      SELECT COUNT(*)::numeric / 10 as rate
      FROM rpc_security.request_log
      WHERE request_time > NOW() - INTERVAL '10 seconds'
    `);

        // Get previous rate for trend
        const previousRateResult = await queryRpcDb<{ rate: number }>(`
      SELECT COUNT(*)::numeric / 10 as rate
      FROM rpc_security.request_log
      WHERE request_time BETWEEN NOW() - INTERVAL '20 seconds' AND NOW() - INTERVAL '10 seconds'
    `);

        const currentRate = parseFloat(String(currentRateResult[0]?.rate || '0'));
        const previousRate = parseFloat(String(previousRateResult[0]?.rate || '0'));

        const trend = currentRate > previousRate * 1.1 ? 'up'
            : currentRate < previousRate * 0.9 ? 'down'
                : 'stable';

        // Fetch attack patterns (last 24 hours)
        const attackPatternsResult = await queryRpcDb<{ total: string | number; low: string | number; medium: string | number; high: string | number; critical: string | number }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical
      FROM rpc_security.attack_patterns
      WHERE detected_at > NOW() - INTERVAL '24 hours'
    `);

        // Fetch whitelist counts
        const whitelistResult = await queryRpcDb<{ ip_count: string | number; wallet_count: string | number }>(`
      SELECT 
        (SELECT COUNT(*) FROM rpc_security.ip_whitelist) as ip_count,
        (SELECT COUNT(*) FROM rpc_security.wallet_whitelist) as wallet_count
    `);

        const stats = {
            activeBans: {
                total: Number(activeBansResult[0]?.total || 0),
                ips: Number(activeBansResult[0]?.ip_count || 0),
                wallets: Number(activeBansResult[0]?.wallet_count || 0),
            },
            requestStats: {
                last5Min: Number(requestStatsResult[0]?.count || 0),
                currentRate: parseFloat(currentRate.toFixed(2)),
                trend,
            },
            attackPatterns: {
                last24h: Number(attackPatternsResult[0]?.total || 0),
                bySeverity: {
                    low: Number(attackPatternsResult[0]?.low || 0),
                    medium: Number(attackPatternsResult[0]?.medium || 0),
                    high: Number(attackPatternsResult[0]?.high || 0),
                    critical: Number(attackPatternsResult[0]?.critical || 0),
                },
            },
            whitelist: {
                ips: Number(whitelistResult[0]?.ip_count || 0),
                wallets: Number(whitelistResult[0]?.wallet_count || 0),
            },
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('[RPC Security Stats API Error]', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats', details: error.message },
            { status: 500 }
        );
    }
}
