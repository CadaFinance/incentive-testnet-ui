import { NextResponse } from 'next/server';
import { checkRedisStatus } from '@/app/actions/redis-debug';

export async function GET() {
    const status = await checkRedisStatus();
    return NextResponse.json(status);
}
