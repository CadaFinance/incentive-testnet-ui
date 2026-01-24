import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    // We also support a 'next' param to redirect back to specific pages
    const trigger = searchParams.get('trigger'); // e.g. 'discord_verify'

    if (!address) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const APP_URL = process.env.NEXT_PUBLIC_TESTNET_APP;
    const redirectUri = `${APP_URL}/api/auth/discord/callback`;

    // State: Pass the wallet address + optional trigger encoded
    // Format: "address__trigger"
    const state = trigger ? `${address}__${trigger}` : address;

    const scope = 'identify';
    // If we wanted to join them to a guild automatically, we'd need 'guilds.join' 
    // but usually bot handles invites, or we just verify membership.
    // For now 'identify' is enough to get their ID and check the bot status.

    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

    return NextResponse.redirect(url);
}
