/**
 * Cloudflare Turnstile Verification
 * Used for bot protection on Faucet and other sensitive endpoints
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY!;

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: secretKey,
                response: token,
                remoteip: ip
            }),
        });

        const data = await response.json();

        if (!data.success) {
            console.warn('[Turnstile Fail]', data['error-codes']);
        }

        return data.success === true;
    } catch (error) {
        console.error('[Turnstile Error]', error);
        return false;
    }
}
