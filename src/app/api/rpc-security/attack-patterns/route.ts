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

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '7');
        const severity = searchParams.get('severity'); // 'low', 'medium', 'high', 'critical'

        let query = `
      SELECT 
        id,
        pattern_type as type,
        severity,
        detected_at,
        ip_count,
        wallet_count,
        request_count,
        auto_blocked,
        notes
      FROM rpc_security.attack_patterns
      WHERE detected_at > NOW() - INTERVAL '${days} days'
    `;

        if (severity) {
            query += ` AND severity = '${severity}'`;
        }

        query += ` ORDER BY detected_at DESC`;

        const patterns = await queryRpcDb<any>(query);

        return NextResponse.json({ patterns });
    } catch (error: any) {
        console.error('[RPC Security Attack Patterns API Error]', error);
        return NextResponse.json(
            { error: 'Failed to fetch attack patterns', details: error.message },
            { status: 500 }
        );
    }
}
