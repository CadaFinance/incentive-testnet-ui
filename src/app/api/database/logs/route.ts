import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await db.query(`
            SELECT * FROM app_logs 
            ORDER BY created_at DESC 
            LIMIT 50
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Log Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
