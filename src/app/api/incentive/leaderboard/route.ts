import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCached } from '@/lib/redis';

export async function GET() {
    try {
        // Cache Key: Global leaderboard, not per-user
        const cacheKey = 'leaderboard:top100';

        const rows = await getCached(cacheKey, async () => {
            const sql = `
                SELECT 
                    address, 
                    points, 
                    total_claims,
                    DENSE_RANK() OVER (
                        ORDER BY 
                            points DESC, 
                            total_claims DESC, 
                            last_active DESC
                    ) as rank
                FROM users
                ORDER BY rank ASC
                LIMIT 100
            `;
            const result = await query(sql);
            return result.rows;
        }, 60); // 60 second TTL - Rankings update every minute

        return NextResponse.json(rows, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
            },
        });
    } catch (error: any) {
        console.error('Leaderboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

