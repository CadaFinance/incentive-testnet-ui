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

        // Get query params
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const statusFilter = searchParams.get('status'); // 200, 429, 403, etc.

        // Build query with optional status filter
        let query = `
      SELECT 
        rl.id,
        rl.ip_address::text as ip,
        rl.request_time as time,
        rl.status_code as status,
        rl.method,
        rl.response_time_ms as response_time,
        rl.user_agent,
        EXISTS(SELECT 1 FROM rpc_security.ip_whitelist WHERE ip_address = rl.ip_address) as is_whitelisted,
        EXISTS(SELECT 1 FROM rpc_security.ip_blacklist WHERE ip_address = rl.ip_address AND (expires_at IS NULL OR expires_at > NOW())) as is_banned
      FROM rpc_security.request_log rl
    `;

        const params: any[] = [];

        if (statusFilter) {
            query += ` WHERE rl.status_code = $1`;
            params.push(parseInt(statusFilter));
            query += ` ORDER BY rl.request_time DESC LIMIT $2`;
            params.push(limit);
        } else {
            query += ` ORDER BY rl.request_time DESC LIMIT $1`;
            params.push(limit);
        }

        const requests = await queryRpcDb(query, params);

        return NextResponse.json({ requests });
    } catch (error: any) {
        console.error('[RPC Security Activity API Error]', error);
        return NextResponse.json(
            { error: 'Failed to fetch activity', details: error.message },
            { status: 500 }
        );
    }
}
