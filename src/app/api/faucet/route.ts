import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseEther, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { query } from '@/lib/db';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { processReferralBonus } from '@/lib/referral_logic';
import { invalidateCache } from '@/lib/redis';

const FAUCET_PRIVATE_KEY = (process.env.FAUCET_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`;
const FAUCET_RPC_URL = process.env.FAUCET_RPC_URL || 'http://51.20.5.66:8545';
const DISBURSE_AMOUNT = parseEther('10');
const COOLDOWN_PERIOD_HOURS = 24;

const account = privateKeyToAccount(FAUCET_PRIVATE_KEY);
const client = createWalletClient({
    account,
    transport: http(FAUCET_RPC_URL, {
        timeout: 10000,
        retryCount: 0
    })
});

export async function POST(req: NextRequest) {
    try {
        const { address, recaptchaToken, referralCode } = await req.json();

        if (!address || !isAddress(address)) {
            return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
        }

        // 1. reCAPTCHA Verification (Corporate Bot Protection)
        if (!recaptchaToken) {
            return NextResponse.json({ error: 'RECAPTCHA_REQUIRED' }, { status: 400 });
        }
        const isHuman = await verifyRecaptcha(recaptchaToken);
        if (!isHuman) {
            return NextResponse.json({ error: 'RECAPTCHA_FAILED' }, { status: 403 });
        }

        const normalizedAddress = address.toLowerCase();

        // 0. Timezone Safety
        // Postgres stores 'claimed_at' as standard timestamp. Date.parse() handles this reliably.

        // 2. Check Database for Cooldown (UTC Calendar Day Logic)
        // Check if the user has already claimed TODAY (UTC)
        // claimed_at is now TIMESTAMPTZ, handling 'AT TIME ZONE UTC' converts it to a timezone-less timestamp at UTC,
        // casting to ::date gives us the YYYY-MM-DD in UTC.

        const lastClaimRes = await query(
            `SELECT 
                (claimed_at AT TIME ZONE 'UTC')::date as claimed_day_utc,
                CURRENT_DATE AT TIME ZONE 'UTC' as today_utc
             FROM faucet_history 
             WHERE address = $1 
             ORDER BY claimed_at DESC LIMIT 1`,
            [normalizedAddress]
        );

        if (lastClaimRes.rows.length > 0) {
            const lastClaimDay = lastClaimRes.rows[0].claimed_day_utc; // Date object or string
            const todayUtc = lastClaimRes.rows[0].today_utc;

            // Compare dates. Postgres driver might return Date objects.
            // Converting to YYYY-MM-DD string is safest.
            const lastDateStr = new Date(lastClaimDay).toISOString().split('T')[0];
            const todayStr = new Date(todayUtc).toISOString().split('T')[0];

            if (lastDateStr === todayStr) {
                // Calculate time remaining until next UTC midnight for UI
                const now = new Date();
                const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
                const msUntilMidnight = tomorrowUTC.getTime() - now.getTime();
                const remainingSeconds = Math.ceil(msUntilMidnight / 1000);

                return NextResponse.json({
                    error: 'COOLDOWN_ACTIVE',
                    timeLeft: remainingSeconds, // seconds until 00:00 UTC
                    formatted: `${Math.floor(remainingSeconds / 3600)}h ${Math.floor((remainingSeconds % 3600) / 60)}m`
                }, { status: 429 });
            }
        }

        // 3. New User Check (For Referral Bonus)
        // Since we now sync users on connect, we check if they have EVER claimed before.
        const historyCheck = await query('SELECT 1 FROM faucet_history WHERE address = $1', [normalizedAddress]);
        const isFirstClaim = historyCheck.rows.length === 0;

        // 4. Execute On-Chain Transaction
        const hash = await client.sendTransaction({
            to: normalizedAddress as `0x${string}`,
            value: DISBURSE_AMOUNT,
            chain: null
        });

        // ... (previous code)

        // 5. Persistent Database Update (Transaction & Points) & Boost Logic
        const userRes = await query("SELECT multiplier FROM users WHERE address = $1", [normalizedAddress]);
        const multiplier = parseFloat(userRes.rows[0]?.multiplier || '1.0');
        const basePoints = 25;
        const boostedPoints = Math.floor(basePoints * multiplier);

        await Promise.all([
            // Record Claim History
            query(
                'INSERT INTO faucet_history (address, amount, tx_hash) VALUES ($1, $2, $3)',
                [normalizedAddress, 10, hash]
            ),
            // Update/Create User Profile & Add Boosted Faucet Points
            query(
                `INSERT INTO users (address, points, total_claims, last_active) 
                 VALUES ($1, $2, 1, NOW()) 
                 ON CONFLICT (address) DO UPDATE SET 
                    points = users.points + $2, 
                    total_claims = users.total_claims + 1,
                    last_active = NOW()`,
                [normalizedAddress, boostedPoints]
            ),
            // Update Faucet Streak (Essential for UI "Daily Tasks")
            query(
                `INSERT INTO daily_streaks (address, streak_type, current_streak, last_action_date, updated_at, cooldown_start_at) 
                 VALUES ($1, 'FAUCET', 1, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC') 
                 ON CONFLICT (address, streak_type) DO UPDATE SET 
                    current_streak = CASE 
                        WHEN daily_streaks.last_action_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date THEN daily_streaks.current_streak -- Already Claimed Today
                        WHEN daily_streaks.last_action_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day' THEN 
                            CASE WHEN daily_streaks.current_streak >= 7 THEN 1 ELSE daily_streaks.current_streak + 1 END
                        ELSE 1 -- Broken Streak
                    END,
                    last_action_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
                    updated_at = NOW() AT TIME ZONE 'UTC',
                    cooldown_start_at = CASE 
                        WHEN daily_streaks.last_action_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date THEN daily_streaks.cooldown_start_at
                        ELSE NOW() AT TIME ZONE 'UTC'
                    END
                 RETURNING current_streak`,
                [normalizedAddress]
            ),
            // Institutional Audit Log for Faucet with Boosted Points
            query(
                'INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)',
                [normalizedAddress, boostedPoints, 'FAUCET_CLAIM']
            )
        ]);

        // 5.5. Weekly Streak Bonus handled by Mission Control (Data Driven)
        // We do NOT award here anymore. We just update the streak counter.

        // 6. Handle Referral Bonus (Post-Link Reward)
        // Check if there is a pending bonus link in DB
        let bonusAwarded = false;
        if (isFirstClaim) {
            const { distributeReferralBonus, registerReferralLink } = await import('@/lib/referral_logic');

            // Edge Case: If user never synced but sent code directly to faucet (Direct Claim)
            if (referralCode) {
                await registerReferralLink(normalizedAddress, referralCode);
            }

            const result = await distributeReferralBonus(normalizedAddress);
            bonusAwarded = result.success; // Referrals have their own logic in referral_logic.ts, verify if they need boost too? 
            // NOTE: Referral bonuses are usually flat 'Bounties', but we could boost them later. Keeping flat for now as "New User Bounty".
        }

        // 7. Refresh Leaderboard
        query('SELECT refresh_leaderboard()').catch(e => console.error('View Refresh Failed', e));

        // Invalidate Redis Cache (Stats + Missions)
        await invalidateCache(`user:stats:${normalizedAddress}`);
        await invalidateCache(`user:missions:${normalizedAddress}`);

        return NextResponse.json({
            success: true,
            hash,
            amount: '10',
            pointsEarned: boostedPoints + (bonusAwarded ? 50 : 0),
            referralBonus: bonusAwarded,
            multiplierApplied: multiplier
        });


    } catch (error) {
        console.error('Faucet Error:', error);
        return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
    }
}
