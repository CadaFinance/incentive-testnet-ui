import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const result = await db.query('SELECT * FROM presale_settings WHERE id = 1');

        let data = {
            goal_amount: 4202850.00,
            countdown_end_date: '2026-01-05T23:59:59Z',
            current_price: 0.00048,
            next_price: 0.00096
        };

        if (result.rows.length > 0) {
            data = result.rows[0];
        }

        return NextResponse.json(data, {
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow all origins for public access (or restrict to localhost:3001)
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    } catch (error) {
        console.error('Failed to fetch presale settings public:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
