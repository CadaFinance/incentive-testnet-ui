import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const result = await db.query('SELECT * FROM presale_settings WHERE id = 1');
        if (result.rows.length === 0) {
            return NextResponse.json({
                goal_amount: 4202850.00,
                countdown_end_date: '2026-01-05T23:59:59Z',
                current_price: 0.00048,
                next_price: 0.00096
            });
        }
        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to fetch presale settings:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { goal_amount, countdown_end_date, current_price, next_price } = body;

        const result = await db.query(
            `UPDATE presale_settings 
             SET goal_amount = $1, countdown_end_date = $2, current_price = $3, next_price = $4, updated_at = NOW()
             WHERE id = 1
             RETURNING *`,
            [goal_amount, countdown_end_date, current_price, next_price]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update presale settings:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
