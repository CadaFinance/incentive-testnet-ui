import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { title, description, reward_points, verification_data, is_active, requires_verification } = body;

        const result = await db.query(
            `UPDATE tasks 
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 reward_points = COALESCE($3, reward_points),
                 verification_data = COALESCE($4, verification_data),
                 is_active = COALESCE($5, is_active),
                 requires_verification = COALESCE($6, requires_verification)
             WHERE id = $7
             RETURNING *`,
            [title, description, reward_points, verification_data, is_active, requires_verification, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update task:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const { id } = await params;

    try {
        await db.query('BEGIN');

        // 1. Delete references in history (Hard Delete / Cascade)
        await db.query('DELETE FROM user_task_history WHERE task_id = $1', [id]);

        // 2. Delete references in daily completions (if any exist from previous logic)
        await db.query('DELETE FROM user_daily_completions WHERE task_id = $1', [id]);

        // 3. Delete the task itself
        const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

        await db.query('COMMIT');

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, id });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Failed to delete task:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
