import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAddress } from 'viem';

export async function POST(req: NextRequest) {
    try {
        const { address, referralCode } = await req.json();

        if (!address || !isAddress(address)) {
            return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
        }

        const normalizedAddress = address.toLowerCase();

        // 1. Register User (if new)
        await query(`
            INSERT INTO users (address, points, total_claims, total_referrals, referral_points, last_active)
            VALUES ($1, 0, 0, 0, 0, NOW())
            ON CONFLICT (address) DO UPDATE SET last_active = NOW()
        `, [normalizedAddress]);

        // 2. Link Referral (if code provided) - NO POINTS YET
        if (referralCode) {
            const { registerReferralLink } = await import('@/lib/referral_logic');
            await registerReferralLink(normalizedAddress, referralCode);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('User Sync Error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
