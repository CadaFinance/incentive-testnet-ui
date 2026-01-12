import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const address = searchParams.get('address');
    const code = searchParams.get('code');

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const GROUP_ID = process.env.TELEGRAM_GROUP_ID;

    if (!BOT_TOKEN) {
        return NextResponse.json({ error: 'Server config error: No Bot Token' }, { status: 500 });
    }

    try {
        // --- ACTION: INIT (Start Session) ---
        if (action === 'init') {
            if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

            const normalizedAddress = address.toLowerCase(); // Case-insensitive fix
            const newCode = randomUUID();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

            await db.query(
                "INSERT INTO telegram_auth_sessions (code, address, status, expires_at) VALUES ($1, $2, 'PENDING', $3)",
                [newCode, normalizedAddress, expiresAt]
            );

            const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'zugverify_bot';
            const deepLink = `https://t.me/${botUsername}?start=${newCode}`;

            return NextResponse.json({ code: newCode, deepLink });
        }

        // --- ACTION: CHECK (Only check DB status - EC2 bot handles Telegram polling) ---
        if (action === 'check') {
            if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

            // Only check DB status - EC2 bot handles Telegram polling and updates DB
            const sessionRes = await db.query(
                "SELECT * FROM telegram_auth_sessions WHERE code = $1",
                [code]
            );

            if (sessionRes.rows.length === 0) {
                return NextResponse.json({ status: 'INVALID' });
            }

            const session = sessionRes.rows[0];

            // Check expiration
            if (session.expires_at && new Date(session.expires_at) < new Date()) {
                return NextResponse.json({ status: 'EXPIRED' });
            }

            // Return status based on DB state
            if (session.status === 'VERIFIED') {
                return NextResponse.json({
                    status: 'VERIFIED',
                    telegram_username: session.telegram_username,
                    is_member: true,
                    points_awarded: 150
                });
            } else if (session.status === 'FAILED_NOT_MEMBER') {
                return NextResponse.json({
                    status: 'NOT_MEMBER',
                    is_member: false
                });
            } else if (session.status === 'FAILED_DUPLICATE') {
                return NextResponse.json({
                    status: 'DUPLICATE',
                    message: "This Telegram account is already linked to another wallet."
                });
            }

            // Still pending - EC2 bot hasn't processed it yet
            return NextResponse.json({ status: 'PENDING' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (e: any) {
        console.error("Telegram Deep Link Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
