import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { telegramUser, address } = body;

        if (!telegramUser || !address) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Validate Telegram Hash (Security Check)
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!BOT_TOKEN) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

        const dataCheckIncluded = { ...telegramUser };
        delete dataCheckIncluded.hash;

        const dataCheckArr = [];
        for (const key in dataCheckIncluded) {
            dataCheckArr.push(`${key}=${dataCheckIncluded[key]}`);
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
        const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (hash !== telegramUser.hash) {
            return NextResponse.json({ error: 'Invalid Telegram data integrity' }, { status: 403 });
        }

        // 2. Check Time (Prevent replay attacks, 5 min window)
        const authDate = telegramUser.auth_date;
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 300) {
            return NextResponse.json({ error: 'Auth data expired' }, { status: 403 });
        }

        const telegramId = telegramUser.id.toString();
        const telegramUsername = telegramUser.username || '';

        // 3. User & Linkage Checks
        // Check if this Telegram ID is already linked to ANY wallet
        const existingLink = await db.query(
            "SELECT address FROM users WHERE telegram_id = $1",
            [telegramId]
        );

        let isAlreadyLinkedToSelf = false;

        if (existingLink.rows.length > 0) {
            const linkedAddress = existingLink.rows[0].address;

            if (linkedAddress.toLowerCase() !== address.toLowerCase()) {
                // Linked to SOMEONE ELSE
                return NextResponse.json({
                    success: false,
                    message: `This Telegram account is already linked to another wallet (${linkedAddress.slice(0, 6)}...${linkedAddress.slice(-4)}).`,
                    error: 'telegram_already_linked'
                }, { status: 400 });
            } else {
                // Linked to SELF
                isAlreadyLinkedToSelf = true;
            }
        }

        // 4. Check Group Membership via Bot API
        const groupId = process.env.TELEGRAM_GROUP_ID;
        const userId = telegramUser.id;

        const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${groupId}&user_id=${userId}`;
        const chatMemberRes = await fetch(telegramApiUrl);
        const chatMemberData = await chatMemberRes.json();

        if (!chatMemberData.ok) {
            console.error('Telegram API Error:', chatMemberData);
            return NextResponse.json({ error: 'Failed to verify membership with Telegram API' }, { status: 500 });
        }

        const status = chatMemberData.result.status;
        const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(status);

        if (!isMember) {
            return NextResponse.json({
                success: false,
                isMember: false,
                message: 'You are not a member of the group yet.',
                joinUrl: 'https://t.me/zugchain'
            });
        }

        // 5. Link & Reward (If not already done)
        let pointsAwarded = 0;

        if (!isAlreadyLinkedToSelf) {
            // A. Update User Profile
            await db.query(
                "UPDATE users SET telegram_id = $1, telegram_username = $2, points = points + 150 WHERE address = $3",
                [telegramId, telegramUsername, address]
            );

            // B. Audit Log
            await db.query(
                "INSERT INTO points_audit_log (address, points_awarded, task_type) VALUES ($1, $2, $3)",
                [address, 150, 'MISSION_SOCIAL_TELEGRAM_JOIN']
            );

            pointsAwarded = 150;
        } else {
            // Just update username in case it changed
            await db.query(
                "UPDATE users SET telegram_username = $2 WHERE address = $3",
                [telegramId, telegramUsername, address]
            );
        }

        return NextResponse.json({
            success: true,
            isMember: true,
            telegram_username: telegramUsername,
            points_awarded: pointsAwarded
        });

    } catch (error) {
        console.error('Telegram Verify Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
