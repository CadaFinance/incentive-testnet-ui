import { db } from '@/lib/db';
import { getCached, invalidateCache } from '@/lib/redis';

export type TaskType = 'SOCIAL' | 'PARTNER' | 'DAILY';
export type VerificationType = 'LINK_CLICK' | 'API_VERIFY' | 'MANUAL' | 'TWEET_VERIFY';

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
    requires_telegram?: boolean;
    requires_discord?: boolean;
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

    // 1. Fetch PENDING Static Missions
    const query = `
        SELECT 
            t.id, t.type, t.title, t.description, t.reward_points, t.verification_type, t.verification_data, t.icon_url, t.is_active, t.requires_verification,
            t.requires_telegram, t.requires_discord,
            to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
            FALSE as is_completed
        FROM tasks t
        LEFT JOIN user_task_history uth 
            ON t.id = uth.task_id AND uth.user_address = $1
        WHERE t.is_active = TRUE 
        AND t.id >= 0 
        AND t.title NOT ILIKE '%Discord%'
        AND uth.id IS NULL -- ONLY PENDING
        ORDER BY t.created_at DESC;
    `;

    // 2. Fetch Streaks for Dynamic Logic
    const streaks = await getUserStreaks(normalizedAddress);
    const dynamicMissions: Task[] = [];

    // Source of Truth for FAUCET: Use PostgreSQL for UTC date comparison
    const faucetHist = await db.query(
        `SELECT 
            CASE 
                WHEN (claimed_at AT TIME ZONE 'UTC')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date 
                THEN TRUE 
                ELSE FALSE 
            END as is_claimed_today
         FROM faucet_history WHERE address = $1 ORDER BY claimed_at DESC LIMIT 1`,
        [normalizedAddress]
    );

    let isFaucetDoneToday = faucetHist.rows.length > 0 && faucetHist.rows[0].is_claimed_today;
    const now = new Date();

    if (!isFaucetDoneToday) {
        dynamicMissions.push({
            id: -1,
            type: 'DAILY',
            title: 'Daily Protocol Access',
            description: 'Claim your daily allowance from the faucet to maintain network activity.',
            reward_points: 25,
            verification_type: 'MANUAL',
            verification_data: '/faucet',
            is_completed: false
        });
    }

    // Source of Truth for STAKE: Use PostgreSQL for UTC date comparison
    const stakeRes = await db.query(
        `SELECT 1 FROM daily_streaks 
         WHERE address = $1 AND streak_type = 'STAKE' 
         AND last_action_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`,
        [normalizedAddress]
    );
    if (stakeRes.rowCount === 0) {
        dynamicMissions.push({
            id: -2,
            type: 'DAILY',
            title: 'Secure the Network',
            description: 'Stake your ZUG tokens to validation nodes to increase security.',
            reward_points: 50,
            verification_type: 'MANUAL',
            verification_data: '/',
            is_completed: false
        });
    }

    // 6. Fetch Discord Status & Completion History
    const discordProfile = await getUserDiscordProfile(normalizedAddress);
    const completedTaskIds = await db.query(
        "SELECT task_id FROM user_task_history WHERE user_address = $1",
        [normalizedAddress]
    ).then(r => r.rows.map(row => row.task_id));

    // Dynamic Task 3: Connect X (Virtual)
    const twitterProfile = await getUserTwitterProfile(normalizedAddress);
    if (!twitterProfile?.twitter_id && !completedTaskIds.includes(-100)) {
        dynamicMissions.push({
            id: -100,
            type: 'SOCIAL',
            title: 'Connect Your X',
            description: 'Connect your X account to verify eligibility for legacy airdrop points.',
            reward_points: 100,
            verification_type: 'MANUAL',
            verification_data: `/api/auth/twitter/login?address=${normalizedAddress}`,
            is_completed: false,
            icon_url: 'https://abs.twimg.com/favicons/twitter.2.ico'
        });
    }

    // Dynamic Task 4: Join Telegram Group
    if (!twitterProfile?.telegram_id && !completedTaskIds.includes(-101)) {
        dynamicMissions.push({
            id: -101,
            type: 'SOCIAL',
            title: 'Join Telegram Community',
            description: 'Join the official ZugChain private group to stay updated.',
            reward_points: 150,
            verification_type: 'API_VERIFY',
            verification_data: 'TELEGRAM_LOGIN',
            is_completed: false,
            icon_url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg'
        });
    }

    // Dynamic Task 5: Join Discord Server (Phase 1)
    if (!twitterProfile?.discord_id && !completedTaskIds.includes(-103)) {
        dynamicMissions.push({
            id: -103,
            type: 'SOCIAL',
            title: 'Join Discord Server',
            description: 'Join the official ZugChain Discord server and verify your membership.',
            reward_points: 100,
            verification_type: 'API_VERIFY',
            verification_data: 'DISCORD_LOGIN',
            is_completed: false,
            icon_url: 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png'
        });
    }

    // Dynamic Task 6: Grab Discord Role (Phase 2)
    // Only show if NOT completed in history (since it depends on specific role check)
    if (!completedTaskIds.includes(-102)) {
        dynamicMissions.push({
            id: -102,
            type: 'SOCIAL',
            title: 'Grab Discord Role',
            description: 'Claim your Verified Contributor role on the Discord server.',
            reward_points: 400,
            verification_type: 'API_VERIFY',
            verification_data: 'DISCORD_LOGIN',
            is_completed: false,
            icon_url: 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png'
        });
    }

    // Dynamic Task 7: Shoutout on X (Tweet Task)
    if (!completedTaskIds.includes(-104)) {
        // Check if user has "CLICKED" this task
        const progressRes = await db.query(
            "SELECT state FROM user_task_progress WHERE user_address = $1 AND task_id = -104",
            [normalizedAddress]
        );
        const hasClicked = progressRes.rows.length > 0 && progressRes.rows[0].state === 'CLICKED';

        dynamicMissions.push({
            id: -104,
            type: 'SOCIAL',
            title: 'Shoutout on X',
            description: 'Tweet about your participation to earn points.',
            reward_points: 1000,
            verification_type: 'TWEET_VERIFY', // Special frontend handling
            verification_data: hasClicked ? 'CLICKED' : 'NOT_CLICKED', // Logic flag for Frontend
            is_completed: false,
            // Lock if Twitter not connected
            requires_verification: !twitterProfile?.twitter_id,
            icon_url: 'https://abs.twimg.com/favicons/twitter.2.ico'
        });
    }

    const res = await db.query(query, [normalizedAddress]);

    return [...dynamicMissions, ...res.rows];
}

/**
 * Get User's Twitter Profile Info
 */
export async function getUserTwitterProfile(address: string) {
    const normalizedAddress = address.toLowerCase();
    const res = await db.query(
        "SELECT twitter_id, twitter_username, twitter_image, legacy_claimed, has_pending_streak_modal, telegram_id, discord_id FROM users WHERE address = $1",
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
 * Get User's Discord Profile Info
 */
export async function getUserDiscordProfile(address: string) {
    const normalizedAddress = address.toLowerCase();
    const res = await db.query(
        "SELECT discord_id, discord_username FROM users WHERE address = $1",
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

    // 2. Get Task Details (Handle Virtual/Negative IDs)
    let basePoints = 0;
    let taskType = '';

    if (taskId < 0) {
        // Special Handling for Virtual Missions
        if (taskId === -103) {
            // Join Discord Server: We actually verify this in the OAuth callback, 
            // but if they call this manually, we should check if they have a discord_id linked.
            const profile = await getUserDiscordProfile(normalizedAddress);
            if (!profile?.discord_id) return { success: false, message: 'OAuth Required: Link Discord first.' };

            // Check if they are actually in the guild
            const guildId = process.env.DISCORD_GUILD_ID;
            const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
            const botToken = process.env.DISCORD_BOT_TOKEN;

            const checkRes = await fetch(`https://discord.com/api/guilds/${guildId}/members/${profile.discord_id}`, {
                headers: { Authorization: `Bot ${botToken}` }
            });

            if (checkRes.status === 404) return { success: false, message: 'Membership not confirmed. Join server first!' };

            basePoints = 100;
            taskType = 'SOCIAL';
        } else if (taskId === -102) {
            // Grab Discord Role: Must have discord_id and be in guild
            const profile = await getUserDiscordProfile(normalizedAddress);
            if (!profile?.discord_id) return { success: false, message: 'OAuth Required: Link Discord first.' };

            const guildId = process.env.DISCORD_GUILD_ID;
            const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
            const botToken = process.env.DISCORD_BOT_TOKEN;

            const roleResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${profile.discord_id}/roles/${roleId}`, {
                method: 'PUT',
                headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' }
            });

            if (!roleResponse.ok) {
                if (roleResponse.status === 404) return { success: false, message: 'Membership not found. Join server first!' };
                return { success: false, message: 'Discord API Error. Try again later.' };
            }

            basePoints = 400;
            taskType = 'SOCIAL';
        } else if (taskId === -104) {
            // Shoutout on X (Tweet Task): Must have twitter_id linked
            // Note: The actual tweet verification happens in /api/missions/verify-tweet
            // This function is called AFTER successful verification
            const profile = await getUserTwitterProfile(normalizedAddress);
            if (!profile?.twitter_id) return { success: false, message: 'OAuth Required: Link Twitter first.' };

            basePoints = 1000;
            taskType = 'SOCIAL';
        } else {
            return { success: false, message: 'Virtual task not found' };
        }
    } else {
        const taskRes = await db.query("SELECT * FROM tasks WHERE id = $1", [taskId]);
        if (taskRes.rows.length === 0) return { success: false, message: 'Task not found' };
        const task = taskRes.rows[0];
        basePoints = task.reward_points;
        taskType = task.type;
    }

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
            [normalizedAddress, boostedPoints, `MISSION_${taskType}_${taskId}`]
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
