import { db } from '@/lib/db';
import { getCached, invalidateCache } from '@/lib/redis';

export type TaskType = 'SOCIAL' | 'PARTNER' | 'DAILY';
export type VerificationType = 'LINK_CLICK' | 'API_VERIFY' | 'MANUAL';

export interface Task {
    id: number;
    type: TaskType;
    title: string;
    description: string;
    reward_points: number;
    verification_type: VerificationType;
    verification_data?: string;
    icon_url?: string;
    is_completed?: boolean; // Hydrated for specific user
    time_left?: number; // For daily tasks on cooldown (seconds)
    next_available_at?: number; // Timestamp
    requires_verification?: boolean;
}

export interface DailyStreak {
    address: string;
    faucet_streak: number;
    stake_streak: number;
    last_faucet_date: Date | null;
    last_stake_date: Date | null;
}

/**
 * Fetch all tasks with completion status
 * NOTE: NOT cached because daily missions need real-time DB checks
 */
export async function getUserMissions(address: string): Promise<Task[]> {
    return getUserMissionsUncached(address);
}

/**
 * Internal: Fetch from DB
 */
async function getUserMissionsUncached(address: string): Promise<Task[]> {
    const normalizedAddress = address.toLowerCase();

    // 1. Fetch Static Missions (Excluding IS_DAILY concept for now as requested to revert)
    const query = `
        SELECT 
            t.id, t.type, t.title, t.description, t.reward_points, t.verification_type, t.verification_data, t.icon_url, t.is_active, t.requires_verification,
            to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
            CASE WHEN uth.id IS NOT NULL THEN TRUE ELSE FALSE END as is_completed
        FROM tasks t
        LEFT JOIN user_task_history uth 
            ON t.id = uth.task_id AND uth.user_address = $1
        WHERE t.is_active = TRUE
        ORDER BY t.created_at DESC;
    `;

    // 2. Fetch Streaks for Dynamic Logic
    const streaks = await getUserStreaks(normalizedAddress);
    const dynamicMissions: Task[] = [];

    // Source of Truth for FAUCET: Use PostgreSQL for UTC date comparison (matches Faucet API logic exactly)
    const faucetHist = await db.query(
        `SELECT 
            CASE 
                WHEN (claimed_at AT TIME ZONE 'UTC')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date 
                THEN TRUE 
                ELSE FALSE 
            END as is_claimed_today,
            claimed_at AT TIME ZONE 'UTC' as claimed_at_utc
         FROM faucet_history 
         WHERE address = $1 
         ORDER BY claimed_at DESC LIMIT 1`,
        [normalizedAddress]
    );

    let isFaucetDoneToday = false;
    if (faucetHist.rows.length > 0) {
        isFaucetDoneToday = faucetHist.rows[0].is_claimed_today;
    }

    // Common time reference for countdown calculations
    const now = new Date();

    // Dynamic Task 1: Daily Faucet
    if (!isFaucetDoneToday) {
        dynamicMissions.push({
            id: -1, // Special ID
            type: 'DAILY',
            title: 'Daily Protocol Access',
            description: 'Claim your daily allowance from the faucet to maintain network activity.',
            reward_points: 25,
            verification_type: 'MANUAL', // Redirects
            verification_data: '/faucet',
            is_completed: false
        });
    } else {
        // Calculate Time Until Next UTC Midnight
        // Tomorrow UTC 00:00:00
        // Re-calculate 'now' to be safe or use existing if scope allows. 
        // 'now' is defined in the parent scope in my previous edit?
        // Let's assume 'now' is available from line 64.
        const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        const msUntilMidnight = tomorrowUTC.getTime() - now.getTime();
        const secondsLeft = Math.ceil(msUntilMidnight / 1000);

        dynamicMissions.push({
            id: -1,
            type: 'DAILY',
            title: 'Daily Protocol Access',
            description: 'Cooldown Active (Resets at 00:00 UTC)',
            reward_points: 25,
            verification_type: 'MANUAL',
            verification_data: '/faucet',
            is_completed: true,
            time_left: secondsLeft,
            next_available_at: tomorrowUTC.getTime()
        });
    }

    // Source of Truth for STAKE: Use PostgreSQL for UTC date comparison
    const stakeRes = await db.query(
        `SELECT 
            CASE 
                WHEN last_action_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date 
                THEN TRUE 
                ELSE FALSE 
            END as is_done_today
         FROM daily_streaks 
         WHERE address = $1 AND streak_type = 'STAKE'`,
        [normalizedAddress]
    );

    let isStakeDoneToday = false;
    if (stakeRes.rows.length > 0) {
        isStakeDoneToday = stakeRes.rows[0].is_done_today;
    }

    // Dynamic Task 2: Daily Stake
    if (!isStakeDoneToday) {
        dynamicMissions.push({
            id: -2, // Special ID
            type: 'DAILY',
            title: 'Secure the Network',
            description: 'Stake your ZUG tokens to validation nodes to increase security.',
            reward_points: 50,
            verification_type: 'MANUAL',
            verification_data: '/',
            is_completed: false
        });
    } else {
        const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        const msUntilMidnight = tomorrowUTC.getTime() - now.getTime();
        const secondsLeft = Math.ceil(msUntilMidnight / 1000);

        dynamicMissions.push({
            id: -2,
            type: 'DAILY',
            title: 'Secure the Network',
            description: 'Cooldown Active (Resets at 00:00 UTC)',
            reward_points: 50,
            verification_type: 'MANUAL',
            verification_data: '/',
            is_completed: true,
            time_left: secondsLeft,
            next_available_at: tomorrowUTC.getTime()
        });
    }

    // 4. Fetch Twitter Status for "Connect X" Mission
    const twitterProfile = await getUserTwitterProfile(normalizedAddress);

    // Dynamic Task 3: Connect X (Virtual)
    if (!twitterProfile?.twitter_id) {
        dynamicMissions.push({
            id: -100,
            type: 'SOCIAL',
            title: 'Link X Identity',
            description: 'Connect your X account to verify eligibility for legacy airdrop points.',
            reward_points: 100, // Bonus for connecting
            verification_type: 'MANUAL',
            verification_data: `/api/auth/twitter/login?address=${normalizedAddress}`,
            is_completed: false,
            icon_url: 'https://abs.twimg.com/favicons/twitter.2.ico' // quick icon placeholder
        });
    } else {
        // Optional: Show as completed
        dynamicMissions.push({
            id: -100,
            type: 'SOCIAL',
            title: 'Link X Identity',
            description: `Connected as @${twitterProfile.twitter_username}`,
            reward_points: 100,
            verification_type: 'MANUAL',
            verification_data: '#',
            is_completed: true
        });
    }

    // 5. Fetch Telegram Status
    const telegramProfile = await getUserTelegramProfile(normalizedAddress);

    // Dynamic Task 4: Join Telegram Group
    // ID: -101 (Special ID for Telegram)
    if (!telegramProfile?.telegram_id) {
        dynamicMissions.push({
            id: -101,
            type: 'SOCIAL',
            title: 'Join Telegram Community',
            description: 'Join the official ZugChain private group to stay updated.',
            reward_points: 150,
            verification_type: 'API_VERIFY',
            verification_data: 'TELEGRAM_LOGIN', // Special signal for UI to show Telegram Widget
            is_completed: false,
            icon_url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg'
        });
    } else {
        dynamicMissions.push({
            id: -101,
            type: 'SOCIAL',
            title: 'Join Telegram Community',
            description: `Verified as @${telegramProfile.telegram_username}`,
            reward_points: 150,
            verification_type: 'MANUAL',
            verification_data: '#',
            is_completed: true,
            icon_url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg'
        });
    }

    const res = await db.query(query, [normalizedAddress]);

    // Filter out completed static missions (One-Time)
    const activeStaticMissions = res.rows.filter((t: any) => !t.is_completed);

    return [...dynamicMissions, ...activeStaticMissions];
}

/**
 * Get User's Twitter Profile Info
 */
export async function getUserTwitterProfile(address: string) {
    const normalizedAddress = address.toLowerCase();
    const res = await db.query(
        "SELECT twitter_id, twitter_username, twitter_image, legacy_claimed, has_pending_streak_modal FROM users WHERE address = $1",
        [normalizedAddress]
    );
    return res.rows[0] || null;
}

/**
 * Get User's Telegram Profile Info
 */
export async function getUserTelegramProfile(address: string) {
    const normalizedAddress = address.toLowerCase();
    const res = await db.query(
        "SELECT telegram_id, telegram_username FROM users WHERE address = $1",
        [normalizedAddress]
    );
    return res.rows[0] || null;
}

/**
 * Get User's Current Streak Status
 */
export async function getUserStreaks(address: string): Promise<DailyStreak> {
    const normalizedAddress = address.toLowerCase();
    const query = `
        SELECT * FROM daily_streaks WHERE address = $1
    `;
    const res = await db.query(query, [normalizedAddress]);

    if (res.rows.length === 0) {
        return {
            address,
            faucet_streak: 0,
            stake_streak: 0,
            last_faucet_date: null,
            last_stake_date: null
        };
    }

    // Better query: Aggregated
    const aggQuery = `
        SELECT 
            MAX(CASE WHEN streak_type = 'FAUCET' THEN current_streak ELSE 0 END) as faucet_streak,
            MAX(CASE WHEN streak_type = 'STAKE' THEN current_streak ELSE 0 END) as stake_streak,
            MAX(CASE WHEN streak_type = 'FAUCET' THEN last_action_date ELSE NULL END) as last_faucet_date,
            MAX(CASE WHEN streak_type = 'STAKE' THEN last_action_date ELSE NULL END) as last_stake_date
        FROM daily_streaks 
        WHERE address = $1
    `;

    const aggRes = await db.query(aggQuery, [normalizedAddress]);
    const d = aggRes.rows[0];

    return {
        address,
        faucet_streak: d.faucet_streak || 0,
        stake_streak: d.stake_streak || 0,
        last_faucet_date: d.last_faucet_date ? new Date(d.last_faucet_date) : null,
        last_stake_date: d.last_stake_date ? new Date(d.last_stake_date) : null
    };
}

/**
 * Verify and Complete a Mission
 */
export async function completeMission(address: string, taskId: number) {
    const normalizedAddress = address.toLowerCase();
    // 1. Check if already completed
    const existing = await db.query(
        "SELECT 1 FROM user_task_history WHERE user_address = $1 AND task_id = $2",
        [normalizedAddress, taskId]
    );

    if (existing.rows.length > 0) {
        return { success: false, message: 'Already completed' };
    }

    // 2. Get Task Details
    const taskRes = await db.query("SELECT * FROM tasks WHERE id = $1", [taskId]);
    if (taskRes.rows.length === 0) return { success: false, message: 'Task not found' };

    const task = taskRes.rows[0];
    const basePoints = task.reward_points;

    // 3. Verification Logic (Simplified for click-verify)
    // In production, check API here depending on task.verification_type

    // 4. Atomic Transaction: Log History + Award Points
    try {
        await db.query('BEGIN');

        // Fetch User Multiplier
        const userRes = await db.query("SELECT multiplier FROM users WHERE address = $1", [normalizedAddress]);
        const multiplier = parseFloat(userRes.rows[0]?.multiplier || '1.0');

        // Apply Multiplier (Account Boost)
        const boostedPoints = Math.floor(basePoints * multiplier);

        // Log Completion
        await db.query(
            "INSERT INTO user_task_history (user_address, task_id) VALUES ($1, $2)",
            [normalizedAddress, taskId]
        );

        // Award Boosted Points
        await db.query(
            "UPDATE users SET points = points + $1 WHERE address = $2",
            [boostedPoints, normalizedAddress]
        );

        // Audit Log
        await db.query(
            "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)",
            [normalizedAddress, boostedPoints, `MISSION_${task.type}_${taskId}`]
        );

        // Invalidate Cache
        await invalidateCache(`user:missions:${normalizedAddress}`);
        await invalidateCache(`user:stats:${normalizedAddress}`);

        await db.query('COMMIT');
        return { success: true, pointsAwarded: boostedPoints };

    } catch (e) {
        await db.query('ROLLBACK');
        console.error(e);
        return { success: false, message: 'Database transaction failed' };
    }
}

/**
 * Get User's Total Points
 */
export async function getUserPoints(address: string): Promise<number> {
    const normalizedAddress = address.toLowerCase();
    const res = await db.query("SELECT points FROM users WHERE address = $1", [normalizedAddress]);
    if (res.rows.length === 0) return 0;
    return parseInt(res.rows[0].points || '0');
}
