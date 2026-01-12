import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAddress } from 'viem';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rawAddress = searchParams.get('address');

    if (!rawAddress || !isAddress(rawAddress)) {
        return NextResponse.json({ error: 'INVALID_ADDRESS', received: rawAddress }, { status: 400 });
    }

    const address = rawAddress.toLowerCase();

    try {
        // 1. Get or Create Referral Code
        let codeRes = await query(
            'SELECT code FROM referral_codes WHERE LOWER(address) = $1',
            [address]
        );

        let code;
        if (codeRes.rows.length === 0) {
            // Generate a random 8-char code
            code = 'ZUG-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            await query(
                'INSERT INTO referral_codes (address, code) VALUES ($1, $2)',
                [address, code]
            );
        } else {
            code = codeRes.rows[0].code;
        }

        // 2. Get Stats from referrals table
        // 2. Get Stats from referrals table
        // Optimized: Uses 'idx_referrals_referrer' directly (data is stored lowercase)
        const statsRes = await query(`
            SELECT 
                COUNT(*) as total_referrals,
                SUM(CASE WHEN faucet_bonus_paid OR zug_stake_bonus_paid OR vzug_stake_bonus_paid THEN 1 ELSE 0 END) as registrations,
                SUM(CASE WHEN zug_stake_bonus_paid OR vzug_stake_bonus_paid THEN 1 ELSE 0 END) as active_stakers
            FROM referrals 
            WHERE referrer_address = $1
        `, [address]);

        // 3. Get total referral points AND total XP from users table
        const pointsRes = await query(
            'SELECT points, referral_points FROM users WHERE LOWER(address) = $1',
            [address]
        );

        // Determine base URL dynamically for testing/production
        const origin = req.nextUrl.origin;
        const link = `${origin}/faucet?ref=${code}`;

        // 4. Institutional Tier Logic (Dual-Requirement)
        const totalReferrals = parseInt(statsRes.rows[0].total_referrals || 0);
        const verifiedReferrals = parseInt(statsRes.rows[0].registrations || 0); // Faucet claimed = Verified
        const totalPoints = parseInt(pointsRes.rows[0]?.points || '0');

        // Removed multiplier as per user request
        const TIERS = [
            { name: 'SCOUT', minInvites: 0, minXP: 0 },
            { name: 'VANGUARD', minInvites: 5, minXP: 500 },
            { name: 'ELITE', minInvites: 20, minXP: 2500 },
            { name: 'LEGEND', minInvites: 50, minXP: 10000 }
        ];

        let currentTier = TIERS[0];
        let nextTier: typeof TIERS[0] | null = TIERS[1];

        // Determine current highest unlocked tier using VERIFIED referrals
        for (let i = TIERS.length - 1; i >= 0; i--) {
            if (verifiedReferrals >= TIERS[i].minInvites && totalPoints >= TIERS[i].minXP) {
                currentTier = TIERS[i];
                nextTier = TIERS[i + 1] || null;
                break;
            }
        }

        // Calculate Progress & Missing Requirements
        let progressPercent = 0;
        let missingRequirements: string[] = [];

        if (nextTier) {
            // 1. XP Progress (75% Weight)
            const xpRange = nextTier.minXP - currentTier.minXP;
            const xpExcess = Math.max(0, totalPoints - currentTier.minXP);

            let xpFraction = 0;
            if (xpRange > 0) {
                xpFraction = Math.min(1, xpExcess / xpRange);
            } else {
                xpFraction = 1;
            }

            // 2. Invites Progress (25% Weight) - USING VERIFIED INVITES
            const invitesRange = nextTier.minInvites - currentTier.minInvites;
            const invitesExcess = Math.max(0, verifiedReferrals - currentTier.minInvites);

            let invitesFraction = 0;
            if (invitesRange > 0) {
                invitesFraction = Math.min(1, invitesExcess / invitesRange);
            } else {
                invitesFraction = 1;
            }

            // Weighted Total
            progressPercent = (xpFraction * 75) + (invitesFraction * 25);

            // 3. Missing Requirements
            const neededInvites = Math.max(0, nextTier.minInvites - verifiedReferrals);
            const neededXP = Math.max(0, nextTier.minXP - totalPoints);

            if (neededInvites > 0) missingRequirements.push(`${neededInvites} invites`); // Updated text
            if (neededXP > 0) missingRequirements.push(`${neededXP} XP`);
        } else {
            progressPercent = 100;
        }

        const tierData = {
            current_tier: currentTier.name,
            next_tier: nextTier ? nextTier.name : 'MAX_LEVEL',
            progress_percent: Math.round(progressPercent),
            missing_requirements: missingRequirements.length > 0
                ? `More ${missingRequirements.join(' & ')}`
                : (nextTier ? 'Ready for Upgrade' : 'Max Level'),
            progress: nextTier ? {
                invites: { current: verifiedReferrals, required: nextTier.minInvites }, // Sending Verified Count
                xp: { current: totalPoints, required: nextTier.minXP }
            } : null
        };

        return NextResponse.json({
            code,
            link,
            stats: {
                total_referrals: totalReferrals,
                verified_referrals: verifiedReferrals, // Added for frontend visibility if needed
                registrations: statsRes.rows[0].registrations ? parseInt(statsRes.rows[0].registrations) : 0,
                active_stakers: statsRes.rows[0].active_stakers ? parseInt(statsRes.rows[0].active_stakers) : 0,
                points_earned: parseInt(pointsRes.rows[0]?.referral_points || '0')
            },
            tier: tierData
        });

    } catch (error) {
        console.error('Referral Code API Error:', error);
        return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 });
    }
}
