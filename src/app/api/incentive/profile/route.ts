import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAddress } from 'viem';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address || !isAddress(address)) {
        return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
    }

    try {
        const userRes = await query(
            `SELECT 
                u.points, 
                u.total_claims, 
                u.last_active,
                (
                    SELECT COUNT(*) + 1 
                    FROM users 
                    WHERE points > u.points 
                    OR (points = u.points AND total_claims > u.total_claims)
                ) as rank 
             FROM users u 
             WHERE LOWER(u.address) = $1`,
            [address.toLowerCase()]
        );

        if (userRes.rows.length === 0) {
            return NextResponse.json({
                address,
                points: 0,
                total_claims: 0,
                last_active: null,
                rank: 0
            });
        }

        return NextResponse.json(userRes.rows[0], {
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
            },
        });

    } catch (error) {
        console.error('Incentive Profile Error:', error);
        return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 });
    }
}

