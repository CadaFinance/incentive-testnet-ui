import { NextResponse } from 'next/server';
import { queryRpcDb } from '@/lib/rpc-db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const query = `
      SELECT 
        ban_type,
        target,
        ban_count,
        banned_at,
        reason
      FROM rpc_security.active_bans 
      WHERE ban_status = 'PERMANENT'
      ORDER BY banned_at DESC
    `;

        const bans = await queryRpcDb(query);

        return NextResponse.json(bans);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch permanent bans' },
            { status: 500 }
        );
    }
}
