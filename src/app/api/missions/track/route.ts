
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { address, taskId } = await req.json();

        if (!address || !taskId) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 });
        }

        const normalizedAddress = address.toLowerCase();

        await db.query(`
            INSERT INTO user_task_progress (user_address, task_id, state)
            VALUES ($1, $2, 'CLICKED')
            ON CONFLICT (user_address, task_id) DO NOTHING
        `, [normalizedAddress, taskId]);

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
