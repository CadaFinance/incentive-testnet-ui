
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { completeMission } from '@/lib/missions';

export async function POST(req: NextRequest) {
    try {
        const { address, tweetUrl } = await req.json();

        if (!address || !tweetUrl) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 });
        }

        const normalizedAddress = address.toLowerCase();

        // 1. Get User's Twitter Info from DB
        const userRes = await db.query(
            "SELECT twitter_username FROM users WHERE address = $1",
            [normalizedAddress]
        );

        if (userRes.rows.length === 0 || !userRes.rows[0].twitter_username) {
            return NextResponse.json({ success: false, message: 'No Twitter account linked to this wallet.' });
        }

        const dbUsername = userRes.rows[0].twitter_username.toLowerCase().replace('@', '');

        // 2. Extract Username from Link
        // Supported formats: 
        // https://x.com/username/status/123
        // https://twitter.com/username/status/123
        let urlObj;
        try {
            urlObj = new URL(tweetUrl);
        } catch {
            return NextResponse.json({ success: false, message: 'Invalid URL format.' });
        }

        const hostname = urlObj.hostname;
        if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) {
            return NextResponse.json({ success: false, message: 'Link must be from x.com or twitter.com' });
        }

        const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
        // pathParts[0] should be username
        if (pathParts.length < 3 || pathParts[1] !== 'status') {
            return NextResponse.json({ success: false, message: 'Invalid tweet URL structure.' });
        }

        const linkUsername = pathParts[0].toLowerCase();

        // 3. Compare
        if (linkUsername !== dbUsername) {
            return NextResponse.json({
                success: false,
                message: 'Tweet verification failed. Please make sure you posted the tweet from your linked Twitter account.'
            });
        }

        // 4. Success! Complete Mission
        const result = await completeMission(normalizedAddress, -104);
        return NextResponse.json(result);

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
