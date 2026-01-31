import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const result = await db.query('SELECT * FROM presale_settings WHERE id = 1');
        if (result.rows.length === 0) {
            return NextResponse.json({
                goal_amount: 7000000.00,
                starting_amount: 5500000.00,
                hourly_rate: 1838.00,
                countdown_start_date: '2026-01-25T00:00:00Z',
                countdown_end_date: '2026-02-28T23:59:59Z',
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
        const { goal_amount, starting_amount, hourly_rate, countdown_start_date, countdown_end_date, current_price, next_price } = body;

        const result = await db.query(
            `UPDATE presale_settings 
             SET goal_amount = $1, starting_amount = $2, hourly_rate = $3, countdown_start_date = $4, countdown_end_date = $5, current_price = $6, next_price = $7, updated_at = NOW()
             WHERE id = 1
             RETURNING *`,
            [goal_amount, starting_amount || 0, hourly_rate || 1838, countdown_start_date, countdown_end_date, current_price, next_price]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update presale settings:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
