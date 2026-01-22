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

    // Decode state to get address
    const [address, trigger] = state.split('__');

    try {
        // 1. Exchange Code for Token
        const tokenStats = await fetch('https://discord.com/api/oauth2/token', {
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

        const tokens = await tokenStats.json();

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

        // 3. Update Database
        // Check if this Discord ID is already linked to ANOTHER address to prevent abuse
        const existing = await db.query("SELECT address FROM users WHERE discord_id = $1 AND address != $2", [user.id, address.toLowerCase()]);
        if (existing.rows.length > 0) {
            return NextResponse.redirect(`${APP_URL}/mission-control?error=discord_already_linked`);
        }

        // Check if user is NEW to Discord (for points logic later)
        const currentUserRes = await db.query("SELECT discord_id FROM users WHERE address = $1", [address.toLowerCase()]);
        const isNewConnection = currentUserRes.rowCount === 0 || !currentUserRes.rows[0].discord_id;

        const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.discriminator) || 0) % 5}.png`;

        // Ensure user exists first (INSERT if needed)
        await db.query(
            `INSERT INTO users (address, discord_id, discord_username, discord_image) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (address) DO UPDATE 
             SET discord_id = $2, discord_username = $3, discord_image = $4`,
            [address.toLowerCase(), user.id, user.username, avatarUrl]
        );

        // Award Points (+500) if new connection
        if (isNewConnection) {
            await db.query(`
                UPDATE users 
                SET points = COALESCE(points, 0) + 500
                WHERE address = $1
            `, [address.toLowerCase()]);

            // Audit Log
            await db.query(
                "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)",
                [address.toLowerCase(), 500, 'MISSION_SOCIAL_CONNECT_DISCORD']
            );
        }

        // 4. Assign Role (Bot Action)
        const guildId = process.env.DISCORD_GUILD_ID;
        const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
        const eliteRoleId = process.env.DISCORD_SOCIAL_ELITE_ROLE_ID;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (guildId && roleId && botToken) {
            try {
                // A. Assign Verified Human Role (Always)
                await fetch(`https://discord.com/api/guilds/${guildId}/members/${user.id}/roles/${roleId}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bot ${botToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                // B. Check for "Social Elite" (Network Scout) Criteria
                // User is now connecting Discord. Do they already have Twitter AND Telegram?
                const socialCheck = await db.query(
                    "SELECT twitter_id, telegram_id FROM users WHERE address = $1",
                    [address.toLowerCase()]
                );

                if (socialCheck.rows.length > 0) {
                    const row = socialCheck.rows[0];
                    if (row.twitter_id && row.telegram_id && eliteRoleId) {
                        // BINGO! Trifecta achieved. Assign Network Scout role.
                        console.log(`🌟 User ${user.username} is a Network Scout! Assigning elite role...`);
                        await fetch(`https://discord.com/api/guilds/${guildId}/members/${user.id}/roles/${eliteRoleId}`, {
                            method: 'PUT',
                            headers: {
                                Authorization: `Bot ${botToken}`,
                                'Content-Type': 'application/json'
                            }
                        });
                    }
                }

            } catch (e) {
                console.error('Bot Role Assignment Error:', e);
            }
        }

        return NextResponse.redirect(`${APP_URL}/mission-control?success=discord_linked`);

    } catch (e) {
        console.error(e);
        return NextResponse.redirect(`${APP_URL}/mission-control?error=server_error`);
    }
}
