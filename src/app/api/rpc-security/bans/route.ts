import { NextRequest, NextResponse } from 'next/server';
import { queryRpcDb, BanEntry } from '@/lib/rpc-db';

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

        // Fetch from the active_bans view
        const bans = await queryRpcDb<BanEntry>(`
            SELECT * FROM rpc_security.active_bans 
            ORDER BY banned_at DESC
        `);

        return NextResponse.json(bans);
    } catch (error: any) {
        console.error('[RPC Bans API Error]', error);
        return NextResponse.json({ error: 'Failed to fetch bans' }, { status: 500 });
    }
}
