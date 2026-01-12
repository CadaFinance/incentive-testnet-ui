import { query } from '@/lib/db';
import { getCached, invalidateCache } from '@/lib/redis';

/**
 * Step 1: Link Referee to Referrer (No Points Awarded Yet)
 * Called during User Sync (Page Visit)
 */
export async function registerReferralLink(refereeAddress: string, referralCode: string) {
    try {
        const normalizedReferee = refereeAddress.toLowerCase();

        // Check if link already exists
        const exists = await query('SELECT 1 FROM referrals WHERE referee_address = $1', [normalizedReferee]);
        if (exists.rows.length > 0) return { success: false, reason: 'ALREADY_LINKED' };

        // Identify Referrer
        const referrerRes = await query('SELECT address FROM referral_codes WHERE code = $1', [referralCode]);
        if (referrerRes.rows.length === 0) return { success: false, reason: 'INVALID_CODE' };

        const referrerAddress = referrerRes.rows[0].address.toLowerCase();
        if (referrerAddress === normalizedReferee) return { success: false, reason: 'SELF_REFERRAL' };

        // Insert Link (Bonus NOT Paid)
        await query(`
            INSERT INTO referrals (referrer_address, referee_address, referral_code, registered_at, faucet_bonus_paid)
            VALUES ($1, $2, $3, NOW(), FALSE)
            ON CONFLICT (referee_address) DO NOTHING
        `, [referrerAddress, normalizedReferee, referralCode]);

        // Also update users table to set referred_by (for UI display purposes)
        await query('UPDATE users SET referred_by = $2 WHERE address = $1', [normalizedReferee, referrerAddress]);

        return { success: true };
    } catch (e) {
        console.error("Link Referral Error", e);
        return { success: false };
    }
}

/**
 * Step 2: Distribute Bonus (On Faucet Claim)
 * Called when a user claims faucet for the first time.
 */
export async function distributeReferralBonus(refereeAddress: string) {
    try {
        const normalizedReferee = refereeAddress.toLowerCase();

        // Find Pending Referral Link
        const linkRes = await query(`
            SELECT referrer_address, referral_code 
            FROM referrals 
            WHERE referee_address = $1 AND faucet_bonus_paid = FALSE
        `, [normalizedReferee]);

        if (linkRes.rows.length === 0) return { success: false, reason: 'NO_PENDING_BONUS' };

        const referrerAddress = linkRes.rows[0].referrer_address;

        await query('BEGIN');

        // Mark as Paid
        await query('UPDATE referrals SET faucet_bonus_paid = TRUE, first_faucet_at = NOW() WHERE referee_address = $1', [normalizedReferee]);

        // Referee Bonus (+50)
        await query('UPDATE users SET points = points + 50 WHERE address = $1', [normalizedReferee]);

        // Referrer Bonus (+100)
        await query(`
            INSERT INTO users (address, points, total_referrals, referral_points, last_active)
            VALUES ($1, 100, 1, 100, NOW())
            ON CONFLICT (address) DO UPDATE SET
                points = users.points + 100,
                total_referrals = users.total_referrals + 1,
                referral_points = users.referral_points + 100,
                last_active = NOW()
        `, [referrerAddress]);

        // Audit Logs
        await query(`
            INSERT INTO points_audit_log (address, points_awarded, task_type)
            VALUES 
                ($1, 50, 'REFERRAL_WELCOME_BONUS'),
                ($2, 100, 'REFERRAL_REWARD_FAUCET')
        `, [normalizedReferee, referrerAddress]);

        // Invalidate Referrer Cache
        await invalidateCache(`user:stats:${referrerAddress}`);

        await query('COMMIT');
        return { success: true };

    } catch (error) {
        await query('ROLLBACK');
        console.error('Bonus Distribute Error:', error);
        return { success: false };
    }
}

// Backward Comaptibility / Direct Call helper (Optional, can be removed)
export async function processReferralBonus(referee: string, code: string) {
    await registerReferralLink(referee, code);
    return await distributeReferralBonus(referee);
}

/**
 * Get Referral Stats & Tier Info (Read Logic)
 * Moved from api/referral/code/route.ts for BFF usage
 */
// ... existing imports ...

// Centralized Tier Definitions
import { REFERRAL_TIERS } from './referral_constants';

export async function getReferralStats(address: string, origin: string = 'https://zug.network') {
    const normalizedAddress = address.toLowerCase();

    // REDIS CACHE WRAPPER: Cache for 5 minutes (300s)
    return await getCached(`user:stats:${normalizedAddress}`, async () => {
        // 1. Get or Create Referral Code
        let codeRes = await query(
            'SELECT code FROM referral_codes WHERE address = $1',
            [normalizedAddress]
        );

        let code;
        if (codeRes.rows.length === 0) {
            code = 'ZUG-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            await query(
                'INSERT INTO referral_codes (address, code) VALUES ($1, $2) ON CONFLICT (address) DO NOTHING',
                [normalizedAddress, code]
            );
            const doubleCheck = await query('SELECT code FROM referral_codes WHERE address = $1', [normalizedAddress]);
            code = doubleCheck.rows[0]?.code || code;
        } else {
            code = codeRes.rows[0].code;
        }

        // 2. Get Stats from referrals table
        const statsRes = await query(`
            SELECT 
                COUNT(*) as total_referrals,
                SUM(CASE WHEN faucet_bonus_paid OR zug_stake_bonus_paid OR vzug_stake_bonus_paid THEN 1 ELSE 0 END) as registrations,
                SUM(CASE WHEN zug_stake_bonus_paid OR vzug_stake_bonus_paid THEN 1 ELSE 0 END) as active_stakers
            FROM referrals 
            WHERE referrer_address = $1
        `, [normalizedAddress]);

        // 3. Get total referral points, XP, AND current multiplier from users table
        const userRes = await query(
            'SELECT points, referral_points, multiplier FROM users WHERE address = $1',
            [normalizedAddress]
        );

        const link = `${origin}/?ref=${code}`;

        // 4. Institutional Tier Logic
        // OPTIMIZATION: Use Raw Query for Real-Time data, accelerated by INDEX idx_referrals_referrer_addr
        const totalReferrals = parseInt(statsRes.rows[0].total_referrals || 0);
        const verifiedReferrals = parseInt(statsRes.rows[0].registrations || 0);
        const totalPoints = parseInt(userRes.rows[0]?.points || '0');
        const currentDbMultiplier = parseFloat(userRes.rows[0]?.multiplier || '1.0');

        let currentTier = REFERRAL_TIERS[0];
        let nextTier: typeof REFERRAL_TIERS[0] | null = REFERRAL_TIERS[1];

        for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
            // CHANGED: Using totalReferrals instead of verifiedReferrals
            if (totalReferrals >= REFERRAL_TIERS[i].minInvites && totalPoints >= REFERRAL_TIERS[i].minXP) {
                currentTier = REFERRAL_TIERS[i];
                nextTier = REFERRAL_TIERS[i + 1] || null;
                break;
            }
        }

        // 5. AUTO-UPDATE MULTIPLIER (Global Account Boost)
        // If calculated tier multiplier is higher than DB multiplier, update it.
        if (currentTier.multiplier > currentDbMultiplier) {
            await query('UPDATE users SET multiplier = $1 WHERE address = $2', [currentTier.multiplier, normalizedAddress]);
            console.log(`[Tier Upgrade] User ${normalizedAddress} upgraded to ${currentTier.name} (Multiplier: ${currentTier.multiplier}x)`);
        }

        // Calculate Progress
        let progressPercent = 0;
        let missingRequirements: string[] = [];

        if (nextTier) {
            const xpRange = nextTier.minXP - currentTier.minXP;
            const xpExcess = Math.max(0, totalPoints - currentTier.minXP);
            let xpFraction = xpRange > 0 ? Math.min(1, xpExcess / xpRange) : 1;

            const invitesRange = nextTier.minInvites - currentTier.minInvites;
            // CHANGED: Using totalReferrals
            const invitesExcess = Math.max(0, totalReferrals - currentTier.minInvites);
            let invitesFraction = invitesRange > 0 ? Math.min(1, invitesExcess / invitesRange) : 1;

            progressPercent = (xpFraction * 75) + (invitesFraction * 25);

            // CHANGED: Using totalReferrals
            const neededInvites = Math.max(0, nextTier.minInvites - totalReferrals);
            const neededXP = Math.max(0, nextTier.minXP - totalPoints);

            if (neededInvites > 0) missingRequirements.push(`${neededInvites} invites`);
            if (neededXP > 0) missingRequirements.push(`${neededXP} XP`);
        } else {
            progressPercent = 100;
        }

        const tierData = {
            current_tier: currentTier.name,
            current_multiplier: currentTier.multiplier, // Send to UI
            next_tier: nextTier ? nextTier.name : 'MAX_LEVEL',
            progress_percent: Math.round(progressPercent),
            missing_requirements: missingRequirements.length > 0
                ? `More ${missingRequirements.join(' & ')}`
                : (nextTier ? 'Ready for Upgrade' : 'Max Level'),
            progress: nextTier ? {
                invites: { current: totalReferrals, required: nextTier.minInvites },
                xp: { current: totalPoints, required: nextTier.minXP }
            } : null
        };

        return {
            code,
            link,
            stats: {
                total_referrals: totalReferrals,
                verified_referrals: verifiedReferrals,
                registrations: statsRes.rows[0].registrations ? parseInt(statsRes.rows[0].registrations) : 0,
                active_stakers: statsRes.rows[0].active_stakers ? parseInt(statsRes.rows[0].active_stakers) : 0,
                points_earned: parseInt(userRes.rows[0]?.referral_points || '0')
            },
            tier: tierData
        };
    }, 300);
}
