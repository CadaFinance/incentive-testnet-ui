import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCached } from '@/lib/redis';

export async function GET() {
    try {
        // Cache global stats for 60 seconds (High Traffic Protection)
        const stats = await getCached('global_stats_v1', async () => {
            const statsSql = `
                SELECT 
                    COUNT(*) as total_users,
                    SUM(points) as total_points,
                    SUM(total_claims) as total_activity
                FROM users
            `;
            const res = await query(statsSql);
            return res.rows[0];
        }, 60);

        // Derived/Simulated Institutional Metrics
        const institutionalStats = {
            total_users: parseInt(stats.total_users) || 0,
            total_points: parseInt(stats.total_points) || 0,
            total_activity: parseInt(stats.total_activity) || 0,
            network_uptime: "99.99%",
            active_validators: 64, // From user info
            last_refresh: new Date().toISOString()
        };

        return NextResponse.json(institutionalStats);
    } catch (error: any) {
        console.error('Global Stats API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
