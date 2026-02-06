import { NextRequest, NextResponse } from 'next/server';
import { rpc_query } from '@/lib/rpc_db';
import { redis } from '@/lib/redis';
import { verifyMessage } from 'viem';

const RATE_LIMIT_PREFIX = 'unban_limit:';
const RATE_LIMIT_WINDOW = 3600; // 1 Hour

export async function POST(req: NextRequest) {
    try {
        const { turnstileToken } = await req.json();

        // Priority 1: Cloudflare Connecting IP
        let ip = req.headers.get('cf-connecting-ip');

        // Priority 2: X-Forwarded-For (Get the first IP)
        if (!ip) {
            const forwarded = req.headers.get('x-forwarded-for');
            if (forwarded) {
                ip = forwarded.split(',')[0].trim();
            }
        }

        // Priority 3: Fallback (should typically not be reached in prod)
        if (!ip) ip = '127.0.0.1';

        // 1. Basic Validation
        if (!turnstileToken) {
            return NextResponse.json({ success: false, error: 'Missing captcha token' }, { status: 400 });
        }

        // 2. Turnstile Verification (Cloudflare)
        const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: JSON.stringify({
                secret: process.env.TURNSTILE_SECRET_KEY,
                response: turnstileToken,
                remoteip: ip
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        const turnstileData = await turnstileRes.json();

        // Ensure strictly verified in production
        if (!turnstileData.success) {
            console.warn(`[Turnstile Fail] IP: ${ip} | Error: ${JSON.stringify(turnstileData['error-codes'])}`);
            // Allow bypassing in development if needed, but enforce in prod
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({ success: false, error: 'Security check failed' }, { status: 403 });
            }
        }

        // 3. Rate Limiting (Redis) - Based on IP since we don't have wallet
        const rateKey = `${RATE_LIMIT_PREFIX}${ip}`;
        const lastUnban = await redis.get(rateKey);
        if (lastUnban) {
            return NextResponse.json({ success: false, error: 'Rate limit exceeded. Try again in 1 hour.' }, { status: 429 });
        }

        // 4. EXECUTE UNBAN (PostgreSQL)
        // We delete from the blacklist. The Sync Worker in Python will pick this up in <1s and update Nginx.
        await rpc_query("DELETE FROM rpc_security.ip_blacklist WHERE ip_address = $1", [ip]);

        // 5. Set Rate Limit
        await redis.set(rateKey, '1', 'EX', RATE_LIMIT_WINDOW);

        console.log(`[UNBAN SUCCESS] IP: ${ip}`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[UNBAN API ERROR]', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
