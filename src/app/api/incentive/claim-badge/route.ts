
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { INSTITUTIONAL_BADGES, BadgeId } from '@/lib/badges';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const address = body.address?.toLowerCase();
        const badgeId = body.badgeId as BadgeId;

        if (!address || !badgeId) {
            return NextResponse.json({ error: 'Missing address or badgeId' }, { status: 400 });
        }

        const badgeDef = INSTITUTIONAL_BADGES[badgeId];
        if (!badgeDef) {
            return NextResponse.json({ error: 'Invalid Badge ID' }, { status: 400 });
        }

        // 1. Fetch User Stats
        const userRes = await db.query(
            "SELECT badges, vzug_staked, vzug_compounded, vzug_claimed FROM users WHERE address = $1",
            [address]
        );

        if (userRes.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userRes.rows[0];
        const currentBadges = user.badges || [];

        // 2. Check overlap
        if (currentBadges.includes(badgeId)) {
            return NextResponse.json({ error: 'Badge already claimed' }, { status: 400 });
        }

        // 3. Verify Eligibility
        let eligible = false;
        let statValue = 0;

        if (badgeId === 'INSTITUTIONAL_STAKER') {
            statValue = parseFloat(user.vzug_staked || '0');
            eligible = statValue >= badgeDef.targetAmount;
        } else if (badgeId === 'COMPOUND_ARCHITECT') {
            statValue = parseFloat(user.vzug_compounded || '0');
            eligible = statValue >= badgeDef.targetAmount;
        } else if (badgeId === 'YIELD_HARVESTER') {
            statValue = parseFloat(user.vzug_claimed || '0');
            eligible = statValue >= badgeDef.targetAmount;
        }

        if (!eligible) {
            return NextResponse.json({
                error: 'Not eligible yet',
                details: `Current: ${statValue} / Target: ${badgeDef.targetAmount}`
            }, { status: 400 });
        }

        // 4. Award Badge & Points
        const rewardPoints = badgeDef.rewardPoints;

        await db.query('BEGIN');

        // Update User: Add Badge & Points
        await db.query(
            `UPDATE users 
             SET 
                badges = badges || $1::jsonb,
                points = points + $2
             WHERE address = $3`,
            [JSON.stringify([badgeId]), rewardPoints, address]
        );

        // Audit Log
        await db.query(
            "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)",
            [address, rewardPoints, `BADGE_CLAIM_${badgeId}`]
        );

        await db.query('COMMIT');

        return NextResponse.json({
            success: true,
            badge: badgeId,
            points_awarded: rewardPoints
        });

    } catch (error: any) {
        await db.query('ROLLBACK');
        console.error('Badge Claim Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
