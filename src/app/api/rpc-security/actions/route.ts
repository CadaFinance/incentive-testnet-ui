import { NextRequest, NextResponse } from 'next/server';
import { queryRpcDb } from '@/lib/rpc-db';

const ADMIN_ADDRESS = (process.env.ADMIN_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_ADDRESS)?.toLowerCase();

function isAdmin(address?: string) {
    if (!address || !ADMIN_ADDRESS) return false;
    return address.toLowerCase() === ADMIN_ADDRESS;
}

export async function POST(req: NextRequest) {
    try {
        const walletAddress = req.headers.get('x-wallet-address');

        if (!isAdmin(walletAddress || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { action, type, target, reason } = body;

        if (!target) {
            return NextResponse.json({ error: 'Target required' }, { status: 400 });
        }

        if (action === 'ban') {
            if (type === 'ip') {
                await queryRpcDb("SELECT rpc_security.ban_ip($1, $2, 'admin_panel')", [target, reason || 'Manual ban']);
            } else if (type === 'wallet') {
                await queryRpcDb("SELECT rpc_security.ban_wallet($1, $2)", [target, reason || 'Manual ban']);
            } else {
                return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
            }
            return NextResponse.json({ success: true, message: `Banned ${target}` });
        }

        else if (action === 'unban') {
            if (type === 'ip') {
                await queryRpcDb("SELECT rpc_security.unban_ip($1)", [target]);
            } else {
                // For wallets, we just delete from the blacklist table directly as there isn't an unban_wallet function exposed or we can create one.
                // Looking at schema, unban_ip exists. Let's check schema for unban_wallet. 
                // Schema has unban_ip but not unban_wallet explicit function in the quick view, 
                // but we can just delete from wallet_blacklist.
                await queryRpcDb("DELETE FROM rpc_security.wallet_blacklist WHERE wallet_address = $1", [target]);
            }
            return NextResponse.json({ success: true, message: `Unbanned ${target}` });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[RPC Action API Error]', error);
        return NextResponse.json({ error: 'Action failed', details: error.message }, { status: 500 });
    }
}
