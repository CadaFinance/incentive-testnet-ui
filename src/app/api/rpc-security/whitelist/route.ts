import { NextRequest, NextResponse } from 'next/server';
import { queryRpcDb } from '@/lib/rpc-db';

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS?.toLowerCase();
const SYSTEM_WALLETS = [
    '0x1b4e99d2a838ee7b524f47a399c34af43a8fad80', // Reward Daemon
    '0x73247ba1be10bbc6b92c8a74ea2fbc6df9c3ca6c', // Team
    '0xf7dbade18f6a714e771998078bd359e3893e6365', // Treasury
    '0x1d79090b69de31bc6f99c8d5565da61f05a0e80a', // Ecosystem
    '0x4b16eb109f8d980ddcc6fd493859a11f0bb0c778', // Community
    '0x76e2377bba20535bdbba72d7e760600c02221b19', // Liquidity
    '0xc2350e5e6ccd85a33d42e810cf5befaba87fcdfb', // Deployer
];

function isAdmin(address?: string) {
    if (!address || !ADMIN_ADDRESS) return false;
    return address.toLowerCase() === ADMIN_ADDRESS;
}

function isSystemWallet(address: string) {
    return SYSTEM_WALLETS.some(w => w.toLowerCase() === address.toLowerCase());
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
        const type = searchParams.get('type'); // 'ip' or 'wallet'

        let whitelist: any[] = [];

        // Fetch IP whitelist
        if (!type || type === 'ip') {
            const ipWhitelist = await queryRpcDb<any>(`
        SELECT 
          id,
          'ip' as whitelist_type,
          ip_address::text as target,
          rate_limit,
          description,
          added_at,
          added_by
        FROM rpc_security.ip_whitelist
        ORDER BY added_at DESC
      `);
            whitelist.push(...ipWhitelist);
        }

        // Fetch wallet whitelist
        if (!type || type === 'wallet') {
            const walletWhitelist = await queryRpcDb<any>(`
        SELECT 
          id,
          'wallet' as whitelist_type,
          wallet_address as target,
          description,
          added_at,
          added_by
        FROM rpc_security.wallet_whitelist
        ORDER BY added_at DESC
      `);

            // Mark system wallets
            walletWhitelist.forEach((w: any) => {
                w.is_system = isSystemWallet(w.target);
            });

            whitelist.push(...walletWhitelist);
        }

        return NextResponse.json({ whitelist });
    } catch (error: any) {
        console.error('[RPC Security Whitelist GET API Error]', error);
        return NextResponse.json(
            { error: 'Failed to fetch whitelist', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const walletAddress = req.headers.get('x-wallet-address');

        if (!isAdmin(walletAddress || '')) {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access only' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { type, target, description, rateLimit } = body;

        if (!type || !target) {
            return NextResponse.json(
                { error: 'Missing required fields: type, target' },
                { status: 400 }
            );
        }

        if (type === 'ip') {
            await queryRpcDb(
                `INSERT INTO rpc_security.ip_whitelist (ip_address, rate_limit, description, added_by)
         VALUES ($1::inet, $2, $3, 'admin')
         ON CONFLICT (ip_address) DO UPDATE
         SET rate_limit = $2, description = $3, added_at = NOW()`,
                [target, rateLimit || 50, description || 'Manual whitelist']
            );
        } else if (type === 'wallet') {
            await queryRpcDb(
                `INSERT INTO rpc_security.wallet_whitelist (wallet_address, description, added_by)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (wallet_address) DO UPDATE
         SET description = $2, added_at = NOW()`,
                [target, description || 'Manual whitelist']
            );
        } else {
            return NextResponse.json(
                { error: 'Invalid whitelist type. Use "ip" or "wallet"' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `${type.toUpperCase()} ${target} added to whitelist`,
        });
    } catch (error: any) {
        console.error('[RPC Security Whitelist POST API Error]', error);
        return NextResponse.json(
            { error: 'Failed to add to whitelist', details: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const walletAddress = req.headers.get('x-wallet-address');

        if (!isAdmin(walletAddress || '')) {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access only' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const target = searchParams.get('target');

        if (!type || !target) {
            return NextResponse.json(
                { error: 'Missing query params: type, target' },
                { status: 400 }
            );
        }

        // Prevent removing system wallets
        if (type === 'wallet' && isSystemWallet(target)) {
            return NextResponse.json(
                { error: 'Cannot remove system wallet from whitelist' },
                { status: 403 }
            );
        }

        if (type === 'ip') {
            await queryRpcDb(
                `DELETE FROM rpc_security.ip_whitelist WHERE ip_address = $1::inet`,
                [target]
            );
        } else if (type === 'wallet') {
            await queryRpcDb(
                `DELETE FROM rpc_security.wallet_whitelist WHERE wallet_address = $1`,
                [target]
            );
        } else {
            return NextResponse.json(
                { error: 'Invalid whitelist type' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `${type.toUpperCase()} ${target} removed from whitelist`,
        });
    } catch (error: any) {
        console.error('[RPC Security Whitelist DELETE API Error]', error);
        return NextResponse.json(
            { error: 'Failed to remove from whitelist', details: error.message },
            { status: 500 }
        );
    }
}
