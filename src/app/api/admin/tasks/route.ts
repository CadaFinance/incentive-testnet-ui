import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const result = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, title, description, reward_points, verification_type, verification_data, icon_url, requires_verification } = body;

        if (!title || !reward_points || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await db.query(
            `INSERT INTO tasks (type, title, description, reward_points, verification_type, verification_data, icon_url, is_active, requires_verification)
             VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
             RETURNING *`,
            [type, title, description, reward_points, verification_type || 'MANUAL', verification_data, icon_url, requires_verification || false]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to create task:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
