
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const clientId = process.env.TWITTER_CLIENT_ID;
    const redirectUri = process.env.TWITTER_CALLBACK_URL; // e.g. http://localhost:3000/api/auth/callback/twitter

    if (!clientId || !redirectUri) {
        console.error("Missing Twitter Login Env Vars");
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Set a cookie with the wallet address to bind on return
    // Valid for 15 minutes
    const cookieStore = await cookies();
    cookieStore.set('pending_bind_address', address, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 15
    });

    // Construct Twitter OAuth 2.0 Authorization URL
    // State should be random for security (CSRF), simpler for MVP: use timestamp or static
    const state = 'state-' + Date.now();
    // Code Challenge is required for PKCE? Twitter OAuth 2.0 supports PKCE.
    // If we use "Confidential Client" (with Client Secret), PKCE might be optional or we pass Secret on token exchange.
    // Twitter docs say: "Confidential clients can use PKCE, but it is not required."

    // Scopes: users.read is minimal needed for ID and Username. tweet.read for tweets.
    const scopes = 'users.read tweet.read offline.access';

    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', 'challenge'); // Simple placeholder if strict PKCE not forced
    authUrl.searchParams.append('code_challenge_method', 'plain');

    return NextResponse.redirect(authUrl.toString());
}
