import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch all users directly from the database
        // Be mindful of the row count in production (pagination might be needed later)
        const res = await db.query("SELECT * FROM users ORDER BY last_active DESC");

        return NextResponse.json(res.rows);
    } catch (error: any) {
        console.error('Database Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch users from database' }, { status: 500 });
    }
}
