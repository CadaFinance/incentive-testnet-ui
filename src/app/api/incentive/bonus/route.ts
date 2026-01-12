import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { address } = await req.json();

        if (!address) {
            return NextResponse.json({ error: 'Address required' }, { status: 400 });
        }

        const normalizedAddress = address.toLowerCase();

        // 1. Verify Streaks (Must both be 7 to claim '7-Day Streak Master' as per UI logic)
        // Actually, logic is: Min(Faucet, Stake) == 7. 
        // Or at least, the "Current Day" visual is 7.

        const streaks = await db.query(
            `SELECT streak_type, current_streak, last_action_date 
             FROM daily_streaks 
             WHERE address = $1`,
            [normalizedAddress]
        );

        const faucetStreak = streaks.rows.find(r => r.streak_type === 'FAUCET')?.current_streak || 0;
        const stakeStreak = streaks.rows.find(r => r.streak_type === 'STAKE')?.current_streak || 0;
        const minStreak = Math.min(faucetStreak, stakeStreak);

        // Allow claim if minStreak is 7 OR if they simply reached 7 on both recently?
        // Let's stick to strict UI logic: Combined Streak 7/7.
        if (minStreak < 7) {
            return NextResponse.json({ error: 'STREAK_NOT_MET', minStreak }, { status: 400 });
        }

        // 2. Check if already claimed for this Cycle/Day
        // We use a general key for the 7th day achievement. 
        // To allow weekly recurring, we key it by Date or simpler:
        // "One claim allowed per 7-day cycle reset". 
        // However, streaks reset to 1 on Day 8 in the DB logic now.
        // So checking if "Claimed Today" is safe enough if they are at 7.
        // But what if they stay at 7 for some reason (fail to reset)?
        // My reset logic: "current_streak >= 7 THEN 1" on next update.
        // So checking "Have I claimed TODAY?" is decent.

        const claimKey = `WEEKLY_STREAK_BONUS_${new Date().toISOString().split('T')[0]}`;

        const existing = await db.query(
            "SELECT 1 FROM points_audit_log WHERE address = $1 AND task_type = $2",
            [normalizedAddress, claimKey]
        );

        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 400 });
        }

        // 3. Award Points
        await db.query(
            `INSERT INTO users (address, points, total_claims, last_active) 
             VALUES ($1, 100, 0, NOW()) 
             ON CONFLICT (address) DO UPDATE SET 
                points = users.points + 100, 
                last_active = NOW()`,
            [normalizedAddress]
        );

        // 4. Log Audit
        await db.query(
            "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, 100, $2)",
            [normalizedAddress, claimKey]
        );

        return NextResponse.json({ success: true, points: 100 });

    } catch (error) {
        console.error('Bonus Claim Error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
