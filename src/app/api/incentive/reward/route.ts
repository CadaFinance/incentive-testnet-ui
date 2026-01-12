import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { address, taskType, txHash } = await req.json();

        if (!address || !taskType) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const pointsMap: Record<string, number> = {
            'NATIVE_STAKE': 25,
            'VZUG_WRAP': 20,
            'GOVERNANCE_VOTE': 15,
            'FAUCET_CLAIM': 25
        };

        const pointsToAward = pointsMap[taskType] || 0;

        if (pointsToAward === 0) {
            return NextResponse.json({ error: 'Invalid task type' }, { status: 400 });
        }

        const addr = address.toLowerCase();

        // 1. Ensure user exists
        await query(
            'INSERT INTO users (address, points) VALUES ($1, 0) ON CONFLICT (address) DO NOTHING',
            [addr]
        );

        // 2. Prevent duplicate rewards for the same TX hash
        if (txHash) {
            const existingTx = await query('SELECT 1 FROM faucet_history WHERE tx_hash = $1', [txHash]);
            if (existingTx.rows.length > 0) {
                return NextResponse.json({ error: 'Reward already claimed for this transaction' }, { status: 400 });
            }
        }

        // 3. Update points
        await query(
            'UPDATE users SET points = points + $1, last_active = NOW() WHERE address = $2',
            [pointsToAward, addr]
        );

        // 4. Institutional Audit Log
        await query(
            'INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)',
            [addr, pointsToAward, taskType]
        );

        // 5. Background Refresh of Leaderboard (REMOVED - Real-time/Live Index now used)
        // No action needed.

        return NextResponse.json({ success: true, pointsAwarded: pointsToAward });

    } catch (error: any) {
        console.error('Reward API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
