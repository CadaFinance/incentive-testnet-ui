import { NextResponse } from 'next/server';
import { completeMission } from '@/lib/missions';
import { invalidateCache } from '@/lib/redis';

export async function POST(request: Request) {
    try {
        const { address: rawAddress, taskId } = await request.json();
        const address = rawAddress?.toLowerCase();

        if (!address || !taskId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Verify & Complete
        const result = await completeMission(address, Number(taskId));

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

        // Invalidate Cache so UI updates instantly
        await invalidateCache(`user:stats:${address}`);

        return NextResponse.json({
            success: true,
            points_awarded: result.pointsAwarded,
            message: 'Mission Completed!'
        });

    } catch (error) {
        console.error('Mission Verify Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
