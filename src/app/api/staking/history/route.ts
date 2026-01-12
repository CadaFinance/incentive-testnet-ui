import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCached } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();
    const type = searchParams.get('type'); // 'ZUG' or 'vZUG'
    let filterParam = searchParams.get('filter')?.toUpperCase();

    if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    try {
        // Cache Key includes address, type, and filter for granularity
        const cacheKey = `staking:history:${address}:${type}:${filterParam || 'ALL'}`;

        const rows = await getCached(cacheKey, async () => {
            const validFilters = ['STAKED', 'COMPOUNDED', 'REWARD_CLAIMED', 'WITHDRAWN', 'UNSTAKE_REQUESTED'];

            let query = "";
            const params: any[] = [address, type];

            if (filterParam) {
                const requestedFilters = filterParam.split(',').filter(f => validFilters.includes(f));
                if (requestedFilters.length > 0) {
                    query = `
                        SELECT 
                            id, address, tx_hash, event_type, contract_type, amount, harvested_yield,
                            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at 
                        FROM staking_history 
                        WHERE address = $1 AND contract_type = $2 
                        AND event_type = ANY($3)
                        ORDER BY created_at DESC LIMIT 100
                    `;
                    params.push(requestedFilters);
                }
            }

            if (!query) {
                query = `
                    SELECT 
                        id, address, tx_hash, event_type, contract_type, amount, harvested_yield,
                        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
                    FROM (
                        (SELECT * FROM staking_history 
                         WHERE address = $1 AND contract_type = $2 
                         AND event_type IN ('STAKED', 'WITHDRAWN', 'UNSTAKE_REQUESTED'))
                        UNION ALL
                        (SELECT * FROM staking_history 
                         WHERE address = $1 AND contract_type = $2 
                         AND event_type NOT IN ('STAKED', 'WITHDRAWN', 'UNSTAKE_REQUESTED')
                         ORDER BY created_at DESC LIMIT 100)
                    ) as combined_history
                    ORDER BY created_at DESC
                `;
            }

            const res = await db.query(query, params);
            return res.rows;
        }, 30); // 30 second TTL

        return NextResponse.json(rows, {
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
            },
        });
    } catch (error) {
        console.error('History API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
