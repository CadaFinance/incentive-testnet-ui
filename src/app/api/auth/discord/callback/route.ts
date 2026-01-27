import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // format: "address" or "address__trigger"
    const APP_URL = process.env.NEXT_PUBLIC_TESTNET_APP;

    if (!code || !state) {
        return NextResponse.redirect(`${APP_URL}/mission-control?error=missing_params`);
    }

    // Decode state to get address and mission context
    // Format: "address__trigger__taskId"
    const stateParts = state.split('__');
    const address = stateParts[0].toLowerCase();
    const trigger = stateParts[1] || '';
    const taskIdString = stateParts[2] || '';
    const targetTaskId = taskIdString ? parseInt(taskIdString) : null;

    try {
        // 1. Exchange Code for Token
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID!,
                client_secret: process.env.DISCORD_CLIENT_SECRET!,
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${APP_URL}/api/auth/discord/callback`
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const tokens = await tokenRes.json();

        if (tokens.error) {
            console.error('Discord Token Error:', tokens);
            return NextResponse.redirect(`${APP_URL}/mission-control?error=discord_token_failed`);
        }

        // 2. Get User Profile
        const userReq = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const user = await userReq.json();

        if (!user.id) {
            console.error('Failed to fetch user profile', user);
            return NextResponse.redirect(`${APP_URL}/mission-control?error=discord_profile_failed`);
        }

        // 3. Link/Update Database (Basic Info)
        const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.discriminator) || 0) % 5}.png`;

        await db.query(`
            UPDATE users 
            SET discord_id = $1, discord_username = $2, discord_image = $3 
            WHERE address = $4
        `, [user.id, user.username, avatarUrl, address]);

        // 4. Verification & Role Action (Bot Action)
        const guildId = process.env.DISCORD_GUILD_ID;
        const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (!guildId || !botToken) {
            console.error("Missing Discord Config (Guild/Bot Token)");
            return NextResponse.redirect(`${APP_URL}/mission-control?error=server_error`);
        }

        // A. Primary Membership Check
        // Attempt to grant role (this will fail with 404 if not a member)
        const roleResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${user.id}/roles/${roleId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bot ${botToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (roleResponse.status === 404) {
            // User Not in Server! Redirect directly to Discord Invite
            await db.query(
                "INSERT INTO app_logs (level, component, message, details) VALUES ($1, $2, $3, $4)",
                ['WARN', 'DISCORD', `Not a member, redirecting to invite: ${user.username}`, { userId: user.id }]
            );
            return NextResponse.redirect('https://discord.com/invite/dV2sQtnQEu');
        }

        // B. Award Points for "Join Discord Server" (-103) if not already done
        const joinCheck = await db.query(
            "SELECT 1 FROM user_task_history WHERE user_address = $1 AND task_id = -103",
            [address]
        );

        if (joinCheck.rowCount === 0) {
            console.log(`🎁 Awarding Join Points (+100) to ${user.username}`);
            await db.query("BEGIN");
            await db.query("INSERT INTO user_task_history (user_address, task_id) VALUES ($1, -103)", [address]);
            await db.query("UPDATE users SET points = COALESCE(points, 0) + 100 WHERE address = $1", [address]);
            await db.query(
                "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, 100, $2)",
                [address, 'MISSION_SOCIAL_-103']
            );
            await db.query("COMMIT");

            await db.query(
                "INSERT INTO app_logs (level, component, message, details) VALUES ($1, $2, $3, $4)",
                ['INFO', 'DISCORD', `✅ Mission -103 Completed: ${user.username}`, { address }]
            );
        }

        // C. Award Points for "Grab Discord Role" (-102) if this was the target
        if (targetTaskId === -102) {
            const roleCheck = await db.query(
                "SELECT 1 FROM user_task_history WHERE user_address = $1 AND task_id = -102",
                [address]
            );

            if (roleCheck.rowCount === 0) {
                if (roleResponse.ok) {
                    console.log(`🎁 Awarding Role Points (+400) to ${user.username}`);
                    await db.query("BEGIN");
                    await db.query("INSERT INTO user_task_history (user_address, task_id) VALUES ($1, -102)", [address]);
                    await db.query("UPDATE users SET points = COALESCE(points, 0) + 400 WHERE address = $1", [address]);
                    await db.query(
                        "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, 400, $2)",
                        [address, 'MISSION_SOCIAL_-102']
                    );
                    await db.query("COMMIT");

                    await db.query(
                        "INSERT INTO app_logs (level, component, message, details) VALUES ($1, $2, $3, $4)",
                        ['INFO', 'DISCORD', `✅ Mission -102 Completed: ${user.username}`, { address, status: roleResponse.status }]
                    );
                } else {
                    const errorData = await roleResponse.json().catch(() => ({}));
                    console.error(`❌ [DISCORD] Failed to grant role. Status: ${roleResponse.status}`, errorData);
                    await db.query(
                        "INSERT INTO app_logs (level, component, message, details) VALUES ($1, $2, $3, $4)",
                        ['ERROR', 'DISCORD', `❌ Failed role grant: ${user.username}`, { status: roleResponse.status, error: errorData }]
                    );
                }
            }
        }

        return NextResponse.redirect(`${APP_URL}/mission-control?success=discord_linked`);

    } catch (e) {
        console.error(e);
        return NextResponse.redirect(`${APP_URL}/mission-control?error=server_error`);
    }
}
