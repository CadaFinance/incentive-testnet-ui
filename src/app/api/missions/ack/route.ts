import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address } = body;

        if (!address) {
            return NextResponse.json({ error: 'Address required' }, { status: 400 });
        }

        await db.query(
            "UPDATE users SET has_pending_streak_modal = false WHERE address = $1",
            [address.toLowerCase()]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Ack API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
