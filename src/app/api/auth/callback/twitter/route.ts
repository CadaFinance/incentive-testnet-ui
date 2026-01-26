
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    console.log("🔵 Twitter Callback Hit!");
    console.log("URL:", request.url);

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log("Params:", { code, state, error });

    const APP_URL = process.env.NEXT_PUBLIC_TESTNET_APP;

    // 1. Check for Errors
    if (error) {
        return NextResponse.redirect(`${APP_URL}/mission-control?error=twitter_auth_failed`);
    }

    if (!code) {
        return NextResponse.redirect(`${APP_URL}/mission-control?error=no_code`);
    }

    // 2. Get Wallet Address from Cookie
    const cookieStore = await cookies();
    const walletAddress = cookieStore.get('pending_bind_address')?.value;

    if (!walletAddress) {
        return NextResponse.redirect(`${APP_URL}/mission-control?error=session_expired`);
    }

    // 3. Exchange Code for Access Token
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const redirectUri = process.env.TWITTER_CALLBACK_URL;

    try {
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
            },
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                client_id: clientId || '',
                redirect_uri: redirectUri || '',
                code_verifier: 'challenge' // Must match code_challenge_method: plain in login
            })
        });

        if (!tokenResponse.ok) {
            const errText = await tokenResponse.text();
            console.error('Twitter Token Error:', errText);
            return NextResponse.redirect(`${APP_URL}/mission-control?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 4. Get User Info (Twitter ID & Username)
        const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userResponse.ok) {
            console.error('Twitter User Info Error');
            return NextResponse.redirect(`${APP_URL}/mission-control?error=user_info_failed`);
        }

        const userData = await userResponse.json();
        const twitterUser = userData.data;
        const { id: twitterId, username, profile_image_url } = twitterUser;

        // 5. Database Logic: Link & Claim Legacy Points
        // We assume address exists in users table because dashboard requires login?
        // Actually, we should upsert the user to be safe.

        // START TRANSACTION ideally, but simple queries for MVP

        // A. Check if this wallet is connecting Twitter for the FIRST time (for +100 Reward)
        const currentUserRes = await db.query("SELECT twitter_id FROM users WHERE address = $1", [walletAddress]);
        const isNewConnection = currentUserRes.rowCount === 0 || !currentUserRes.rows[0].twitter_id;

        // B. Link Twitter ID to Wallet (Upsert)
        // First check if this twitter ID is already linked to ANOTHER wallet
        const existingLink = await db.query(
            "SELECT address FROM users WHERE twitter_id = $1 AND address != $2",
            [twitterId, walletAddress]
        );

        if (existingLink.rowCount && existingLink.rowCount > 0) {
            return NextResponse.redirect(`${APP_URL}/mission-control?error=twitter_already_linked`);
        }

        // Upsert User with Twitter Data
        await db.query(`
            INSERT INTO users (address, twitter_id, twitter_username, twitter_image)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (address) 
            DO UPDATE SET 
                twitter_id = EXCLUDED.twitter_id,
                twitter_username = EXCLUDED.twitter_username,
                twitter_image = EXCLUDED.twitter_image
        `, [walletAddress, twitterId, username, profile_image_url]);


        // C. Calculate Rewards (Legacy + New Connection Bonus)
        let pointsToAdd = 0;
        let legacyClaimedAmount = 0;

        // 1. Connection Bonus (+100)
        if (isNewConnection) {
            pointsToAdd += 100;
            // Audit Log for Bonus
            await db.query(
                "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)",
                [walletAddress, 100, 'MISSION_SOCIAL_CONNECT_TWITTER']
            );
        }

        // 2. Legacy Points
        const legacyRes = await db.query(
            "SELECT total_points, is_claimed FROM legacy_points WHERE twitter_id = $1",
            [twitterId]
        );

        if (legacyRes.rowCount && legacyRes.rowCount > 0) {
            const legacyRow = legacyRes.rows[0];

            if (!legacyRow.is_claimed && legacyRow.total_points > 0) {
                legacyClaimedAmount = legacyRow.total_points;
                pointsToAdd += legacyClaimedAmount;

                // Mark Legacy as Claimed
                await db.query(`
                    UPDATE legacy_points
                    SET is_claimed = TRUE,
                        claimed_by_address = $1,
                        claimed_at = NOW()
                    WHERE twitter_id = $2
                `, [walletAddress, twitterId]);

                // Audit Log for Legacy (Optional but good for tracking)
                await db.query(
                    "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)",
                    [walletAddress, legacyClaimedAmount, 'LEGACY_CLAIM']
                );
            }
        }

        // D. Apply Total Points Update
        if (pointsToAdd > 0) {
            await db.query(`
                UPDATE users 
                SET points = COALESCE(points, 0) + $1
                WHERE address = $2
            `, [pointsToAdd, walletAddress]);
        }

        // E. TRIFECTA CHECK (Twitter just linked, check Discord + Telegram)
        const socialCheck = await db.query(
            "SELECT discord_id, telegram_id FROM users WHERE address = $1",
            [walletAddress]
        );

        if (socialCheck.rows.length > 0) {
            const row = socialCheck.rows[0];
            const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
            const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
            const DISCORD_SOCIAL_ELITE_ROLE_ID = process.env.DISCORD_SOCIAL_ELITE_ROLE_ID;

            if (row.discord_id && row.telegram_id && DISCORD_GUILD_ID && DISCORD_BOT_TOKEN && DISCORD_SOCIAL_ELITE_ROLE_ID) {
                console.log(`🌟 User ${walletAddress} achieved Trifecta via Twitter! Assigning role...`);
                // Assign Role via Discord API
                // We don't await this to avoid blocking the redirect if it's slow
                fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${row.discord_id}/roles/${DISCORD_SOCIAL_ELITE_ROLE_ID}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(err => console.error("Trifecta Role Error (Twitter):", err));
            }
        }

        // 6. Success Redirect
        // Clear cookie
        cookieStore.delete('pending_bind_address');

        let redirectUrl = `${APP_URL}/mission-control?success=twitter_linked`;
        if (legacyClaimedAmount > 0) {
            redirectUrl += `&points_claimed=${legacyClaimedAmount}`;
        }

        return NextResponse.redirect(redirectUrl);

    } catch (e) {
        console.error("Callback Fatal Error:", e);
        return NextResponse.redirect(`${APP_URL}/mission-control?error=server_error`);
    }
}
