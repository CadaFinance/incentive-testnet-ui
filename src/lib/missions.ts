import { db } from '@/lib/db';
import { getCached, invalidateCache } from '@/lib/redis';

export type TaskType = 'SOCIAL' | 'PARTNER' | 'DAILY';
export type VerificationType = 'LINK_CLICK' | 'API_VERIFY' | 'MANUAL' | 'TWEET_VERIFY' | 'X_PROFILE_UPDATE';

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
/**
 * Internal: Fetch from DB (Optimized "One-Shot" Query)
 * Replaces N+1 Query pattern with single efficient SELECT + LATERAL JOINS
 */
async function getUserMissionsUncached(address: string): Promise<Task[]> {
    const normalizedAddress = address.toLowerCase();
    const todayUTC = new Date().toISOString().split('T')[0];

    const query = `
        WITH user_state AS (
            -- Fetch all user context in one go (Streaks, Social Profiles, History)
            SELECT 
                u.address,
                u.twitter_id,
                u.telegram_id,
                u.discord_id,
                
                -- Streak Data (Aggregated)
                COALESCE(ds_stake.current_streak, 0) as stake_streak,
                COALESCE(ds_faucet.current_streak, 0) as faucet_streak,
                ds_stake.last_action_date as last_stake_date,
                ds_faucet.last_action_date as last_faucet_date,

                -- Faucet & Stake Status for Today (UTC)
                EXISTS (
                    SELECT 1 FROM faucet_history fh 
                    WHERE fh.address = u.address 
                    AND (fh.claimed_at AT TIME ZONE 'UTC')::date = CURRENT_DATE
                ) as is_faucet_done_today,

                -- Completed Tasks Array (Fast Lookup)
                ARRAY(
                    SELECT task_id FROM user_task_history uth 
                    WHERE uth.user_address = u.address
                ) as completed_task_ids,

                -- Progress for Complex Tasks
                (SELECT state FROM user_task_progress utp WHERE utp.user_address = u.address AND utp.task_id = -104 LIMIT 1) as task_104_state

            FROM users u
            LEFT JOIN daily_streaks ds_stake ON ds_stake.address = u.address AND ds_stake.streak_type = 'STAKE'
            LEFT JOIN daily_streaks ds_faucet ON ds_faucet.address = u.address AND ds_faucet.streak_type = 'FAUCET'
            WHERE u.address = $1
        )
        SELECT 
            -- Standard Tasks
            t.id, t.type, t.title, t.description, t.reward_points, t.verification_type, t.verification_data, t.icon_url, t.is_active, 
            t.requires_verification, t.requires_telegram, t.requires_discord,
            FALSE as is_completed, -- Pending missions by definition
            to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        FROM tasks t, user_state us
        WHERE t.is_active = TRUE 
          AND t.id >= 0 
          AND t.title NOT ILIKE '%Discord%'
          AND NOT (t.id = ANY(us.completed_task_ids)) -- Filter completed

        UNION ALL

        -- Virtual / Dynamic Missions (Computed in SQL instead of JS)
        
        -- 1. Daily Faucet
        SELECT -1, 'DAILY', 'Daily Protocol Access', 'Claim your daily allowance from the faucet to maintain network activity.', 
               25, 'MANUAL', '/faucet', NULL, TRUE, FALSE, FALSE, FALSE, FALSE, NOW()::text
        FROM user_state us WHERE NOT us.is_faucet_done_today

        UNION ALL

        -- 2. Daily Stake
        SELECT -2, 'DAILY', 'Secure the Network', 'Stake your ZUG tokens to validation nodes to increase security.',
               50, 'MANUAL', '/', NULL, TRUE, FALSE, FALSE, FALSE, FALSE, NOW()::text
        FROM user_state us 
        WHERE (us.last_stake_date IS NULL OR us.last_stake_date < CURRENT_DATE)

        UNION ALL

        -- 3. Connect X
        SELECT -100, 'SOCIAL', 'Connect Your X', 'Connect your X account to verify eligibility for legacy airdrop points.',
               100, 'MANUAL', '/api/auth/twitter/login?address=' || us.address, 'https://abs.twimg.com/favicons/twitter.2.ico', TRUE, FALSE, FALSE, FALSE, FALSE, NOW()::text
        FROM user_state us 
        WHERE us.twitter_id IS NULL AND NOT (-100 = ANY(us.completed_task_ids))

        UNION ALL

        -- 4. Join Telegram
        SELECT -101, 'SOCIAL', 'Join Telegram Community', 'Join the official ZugChain private group to stay updated.',
               150, 'API_VERIFY', 'TELEGRAM_LOGIN', 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg', TRUE, FALSE, FALSE, FALSE, FALSE, NOW()::text
        FROM user_state us 
        WHERE us.telegram_id IS NULL AND NOT (-101 = ANY(us.completed_task_ids))

        UNION ALL

        -- 5. Join Discord (Phase 1)
        SELECT -103, 'SOCIAL', 'Join Discord Server', 'Join the official ZugChain Discord server and verify your membership.',
               100, 'API_VERIFY', 'DISCORD_LOGIN', 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png', TRUE, FALSE, FALSE, FALSE, FALSE, NOW()::text
        FROM user_state us 
        WHERE us.discord_id IS NULL AND NOT (-103 = ANY(us.completed_task_ids))

        UNION ALL

        -- 6. Grab Discord Role
        SELECT -102, 'SOCIAL', 'Grab Discord Role', 'Claim your Verified Contributor role on the Discord server.',
               400, 'API_VERIFY', 'DISCORD_LOGIN', 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png', TRUE, FALSE, FALSE, FALSE, FALSE, NOW()::text
        FROM user_state us 
        WHERE NOT (-102 = ANY(us.completed_task_ids))
        
        UNION ALL

        -- 7. Shoutout on X
        SELECT -104, 'SOCIAL', 'Shoutout on X', 'Tweet about your participation to earn points.',
               1000, 'TWEET_VERIFY', CASE WHEN us.task_104_state = 'CLICKED' THEN 'CLICKED' ELSE 'NOT_CLICKED' END, 'https://abs.twimg.com/favicons/twitter.2.ico', TRUE, 
               (us.twitter_id IS NULL), -- Requires Verification if no Twitter
               FALSE, FALSE, FALSE, NOW()::text
        FROM user_state us 
        WHERE NOT (-104 = ANY(us.completed_task_ids))

        UNION ALL

        -- 8. Update X Profile
        SELECT -105, 'SOCIAL', 'Update X Profile', 'Add ZugChain branding to your X profile name and bio to show your support.',
               1500, 'X_PROFILE_UPDATE', 'X_PROFILE_MODAL', 'https://abs.twimg.com/favicons/twitter.2.ico', TRUE, 
               (us.twitter_id IS NULL), 
               FALSE, FALSE, FALSE, NOW()::text
        FROM user_state us 
        WHERE NOT (-105 = ANY(us.completed_task_ids));
    `;

    try {
        const res = await db.query(query, [normalizedAddress]);
        return res.rows;
    } catch (e: any) {
        // Fallback for empty user (fresh wallet)
        if (e.message && e.message.includes('user_state')) {
            console.warn("User state missing for missions, returning default missions.");
        }
        console.error("Optimized Mission Query Failed:", e);
        // Fail gracefully with basic tasks if DB complex query fails?
        // Or re-throw? Re-throwing is safer to detect issues.
        throw e;
    }
}

/**
 * Get User's Twitter Profile Info
 */
export async function getUserTwitterProfile(address: string) {
    const normalizedAddress = address.toLowerCase();
    const res = await db.query(
        "SELECT twitter_id, twitter_username, twitter_image, legacy_claimed, has_pending_streak_modal, telegram_id, discord_id, badges, vzug_staked, vzug_compounded, vzug_claimed FROM users WHERE address = $1",
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
        } else if (taskId === -105) {
            // Update X Profile: Simulated verification (screenshot uploaded client-side only)
            // Must have twitter_id linked
            const profile = await getUserTwitterProfile(normalizedAddress);
            if (!profile?.twitter_id) return { success: false, message: 'OAuth Required: Link X account first.' };

            basePoints = 1500;
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
