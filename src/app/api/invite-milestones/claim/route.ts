import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAddress } from 'viem';

/**
 * POST /api/invite-milestones/claim
 * 
 * Claims a milestone reward for a user
 * 
 * Body: { address: string, milestone_id: number }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { address: rawAddress, milestone_id } = body;

        // Validation
        if (!rawAddress || !isAddress(rawAddress)) {
            return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
        }

        if (!milestone_id || typeof milestone_id !== 'number') {
            return NextResponse.json({ error: 'INVALID_MILESTONE_ID' }, { status: 400 });
        }

        const address = rawAddress.toLowerCase();

        // Start transaction
        await query('BEGIN');

        // 1. Get milestone details
        const milestoneRes = await query(`
            SELECT id, name, required_verified_invites, reward_points, is_active
            FROM invite_milestone_tasks
            WHERE id = $1
        `, [milestone_id]);

        if (milestoneRes.rows.length === 0) {
            await query('ROLLBACK');
            return NextResponse.json({ error: 'MILESTONE_NOT_FOUND' }, { status: 404 });
        }

        const milestone = milestoneRes.rows[0];

        if (!milestone.is_active) {
            await query('ROLLBACK');
            return NextResponse.json({ error: 'MILESTONE_INACTIVE' }, { status: 400 });
        }

        // 2. Check if already claimed
        const existingClaim = await query(`
            SELECT id FROM user_invite_completions
            WHERE user_address = $1 AND milestone_id = $2
        `, [address, milestone_id]);

        if (existingClaim.rows.length > 0) {
            await query('ROLLBACK');
            return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 400 });
        }

        // 3. Verify user has enough verified invites
        const statsRes = await query(`
            SELECT 
                SUM(CASE WHEN faucet_bonus_paid OR zug_stake_bonus_paid OR vzug_stake_bonus_paid THEN 1 ELSE 0 END) as verified_invites
            FROM referrals 
            WHERE referrer_address = $1
        `, [address]);

        const verifiedInvites = parseInt(statsRes.rows[0]?.verified_invites || '0');

        if (verifiedInvites < milestone.required_verified_invites) {
            await query('ROLLBACK');
            return NextResponse.json({
                error: 'INSUFFICIENT_INVITES',
                required: milestone.required_verified_invites,
                current: verifiedInvites
            }, { status: 400 });
        }

        // 4. Award points to user
        await query(`
            INSERT INTO users (address, points, last_active)
            VALUES ($1, $2, NOW())
            ON CONFLICT (address) DO UPDATE SET
                points = users.points + $2,
                last_active = NOW()
        `, [address, milestone.reward_points]);

        // 5. Record completion
        await query(`
            INSERT INTO user_invite_completions (user_address, milestone_id, points_awarded)
            VALUES ($1, $2, $3)
        `, [address, milestone_id, milestone.reward_points]);

        // 6. Audit log
        await query(`
            INSERT INTO points_audit_log (address, points_awarded, task_type, metadata)
            VALUES ($1, $2, $3, $4)
        `, [
            address,
            milestone.reward_points,
            'INVITE_MILESTONE',
            JSON.stringify({ milestone_id, milestone_name: milestone.name })
        ]);

        await query('COMMIT');

        return NextResponse.json({
            success: true,
            milestone_name: milestone.name,
            points_awarded: milestone.reward_points,
            new_total_verified_invites: verifiedInvites
        });

    } catch (error) {
        await query('ROLLBACK');
        console.error('Milestone Claim Error:', error);
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}
