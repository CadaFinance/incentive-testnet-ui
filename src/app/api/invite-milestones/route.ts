import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAddress } from 'viem';

/**
 * GET /api/invite-milestones?address=0x...
 * 
 * Returns all invite milestones with user's completion status
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rawAddress = searchParams.get('address');

    if (!rawAddress || !isAddress(rawAddress)) {
        return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
    }

    const address = rawAddress.toLowerCase();

    try {
        // 1. Get user's current verified invites count
        const statsRes = await query(`
            SELECT 
                SUM(CASE WHEN faucet_bonus_paid OR zug_stake_bonus_paid OR vzug_stake_bonus_paid THEN 1 ELSE 0 END) as verified_invites
            FROM referrals 
            WHERE referrer_address = $1
        `, [address]);

        const verifiedInvites = parseInt(statsRes.rows[0]?.verified_invites || '0');

        // 2. Get all active milestones
        const milestonesRes = await query(`
            SELECT 
                id,
                name,
                description,
                required_verified_invites,
                reward_points,
                icon,
                tier_order
            FROM invite_milestone_tasks
            WHERE is_active = true
            ORDER BY tier_order ASC
        `);

        // 3. Get user's claimed milestones
        const claimedRes = await query(`
            SELECT milestone_id, claimed_at, points_awarded
            FROM user_invite_completions
            WHERE user_address = $1
        `, [address]);

        const claimedSet = new Set(claimedRes.rows.map(r => r.milestone_id));

        // 4. Build response with status for each milestone
        const milestones = milestonesRes.rows.map(m => {
            const isClaimed = claimedSet.has(m.id);
            const isUnlocked = verifiedInvites >= m.required_verified_invites;
            const canClaim = isUnlocked && !isClaimed;

            return {
                id: m.id,
                name: m.name,
                description: m.description,
                required_verified_invites: m.required_verified_invites,
                reward_points: m.reward_points,
                icon: m.icon,
                tier_order: m.tier_order,
                is_unlocked: isUnlocked,
                is_claimed: isClaimed,
                can_claim: canClaim
            };
        });

        return NextResponse.json({
            current_verified_invites: verifiedInvites,
            milestones
        });

    } catch (error) {
        console.error('Invite Milestones API Error:', error);
        return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 });
    }
}
