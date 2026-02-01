import { NextRequest, NextResponse } from 'next/server';
import { queryRpcDb, RequestLog } from '@/lib/rpc-db';

const ADMIN_ADDRESS = (process.env.ADMIN_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_ADDRESS)?.toLowerCase();

function isAdmin(address?: string) {
    if (!address || !ADMIN_ADDRESS) return false;
    return address.toLowerCase() === ADMIN_ADDRESS;
}

export async function GET(req: NextRequest) {
    try {
        const walletAddress = req.headers.get('x-wallet-address');

        if (!isAdmin(walletAddress || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const statusFilter = searchParams.get('status');

        let query = `SELECT * FROM rpc_security.request_log`;
        const params: any[] = [limit];

        if (statusFilter === 'blocked') {
            query += ` WHERE status_code IN (403, 429)`;
        } else if (statusFilter === 'error') {
            query += ` WHERE status_code >= 400`;
        } else if (statusFilter === 'post') {
            query += ` WHERE method = 'POST'`;
        }

        query += ` ORDER BY request_time DESC LIMIT $1`;

        const logs = await queryRpcDb<RequestLog>(query, params);

        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('[RPC Logs API Error]', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
