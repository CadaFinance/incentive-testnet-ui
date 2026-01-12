import { NextResponse } from 'next/server';
import { getUserMissions, getUserStreaks, getUserPoints, getUserTwitterProfile } from '@/lib/missions';
import { getReferralStats } from '@/lib/referral_logic';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams, origin } = new URL(request.url);
        const address = searchParams.get('address')?.toLowerCase();

        if (!address) {
            return NextResponse.json({ error: 'Address required' }, { status: 400 });
        }

        // Parallel Fetch for Performance (BFF Pattern)
        const [missions, streaks, points, referralInfo, userProfile] = await Promise.all([
            getUserMissions(address),
            getUserStreaks(address),
            getUserPoints(address),
            getReferralStats(address, origin),
            getUserTwitterProfile(address)
        ]);

        // Data-Driven Bonus Logic:
        // 1. Must be Day 7 (Both streaks >= 7)
        // 2. Must be FRESH (Action taken TODAY) - Prevents stale farming
        // 3. Must NOT have been awarded yet today

        const faucetStreak = streaks.faucet_streak || 0;
        const stakeStreak = streaks.stake_streak || 0;
        const minStreak = Math.min(faucetStreak, stakeStreak);

        // Fix Date Parsing: Postgres 'date' type is returned as Date object at Local Midnight.
        // toISOString() converts to UTC, often shifting to Previous Day.
        // We must extract YYYY-MM-DD using local methods to match the stored DB value.
        const toDateStr = (d: any) => {
            if (!d) return '';
            const date = new Date(d);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const lastFaucet = toDateStr(streaks.last_faucet_date);
        const lastStake = toDateStr(streaks.last_stake_date);
        const todayStr = new Date().toISOString().split('T')[0];

        const isFresh = (lastFaucet === todayStr || lastStake === todayStr);

        const claimKey = `WEEKLY_STREAK_BONUS_${todayStr}`;
        const claimCheck = await db.query(
            "SELECT 1 FROM points_audit_log WHERE address = $1 AND task_type = $2 LIMIT 1",
            [address, claimKey]
        );

        // SERVER-SIDE AUTO-AWARD LOGIC (Zero Latency)
        let streakBonusEarned = claimCheck.rows.length > 0;
        let pointsToAdd = 0;

        if ((minStreak >= 7) && isFresh && !streakBonusEarned) {
            try {
                // Award points immediately
                await db.query(
                    `INSERT INTO users (address, points, total_claims, last_active, has_pending_streak_modal) 
                     VALUES ($1, 1000, 0, NOW(), true) 
                     ON CONFLICT (address) DO UPDATE SET 
                        points = users.points + 1000, 
                        last_active = NOW(),
                        has_pending_streak_modal = true`,
                    [address]
                );
                await db.query(
                    "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, 1000, $2)",
                    [address, claimKey]
                );

                streakBonusEarned = true;
                pointsToAdd = 1000;
            } catch (e) {
                console.error("Auto-Award Error:", e);
            }
        }

        const adjustedPoints = points + pointsToAdd;

        return NextResponse.json({
            missions,
            streaks,
            points: adjustedPoints,
            referralInfo,
            userProfile,
            streakBonusEarned, // Frontend triggers modal based on this
            streakBonusModalPending: userProfile?.has_pending_streak_modal || (pointsToAdd > 0),
            config: {
                streak_reward_day_7: 1000,
                streak_cycle_days: 7
            }
        });

    } catch (error) {
        console.error('Missions API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
