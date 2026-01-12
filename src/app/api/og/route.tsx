import { ImageResponse } from 'next/og';

// Removed edge runtime as it's incompatible with standard Node.js packages used in the project.

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const refCode = searchParams.get('ref') || 'ZUG';

        // S-Tier Neon Glow (Refined Specification)
        const neonGlow = '0 0 10px rgba(170,255,0,0.14), 0 0 22px rgba(170,255,0,0.06)';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#050505',
                        backgroundImage: `
                            radial-gradient(circle at 50% 50%, rgba(226, 255, 61, 0.04) 0%, transparent 60%),
                            linear-gradient(rgba(226, 255, 61, 0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(226, 255, 61, 0.03) 1px, transparent 1px)
                        `,
                        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
                        backgroundPosition: 'center center',
                        fontFamily: 'monospace',
                        position: 'relative',
                    }}
                >
                    {/* Film Grain Layer */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E")`,
                        display: 'flex',
                    }} />
                    {/* Top Terminal Strip (HUD Signals) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', backgroundColor: 'rgba(226, 255, 61, 0.08)', borderBottom: '1px solid rgba(226, 255, 61, 0.2)', display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between' }}>
                        <div style={{ color: '#E2FF3D', fontSize: '13px', fontWeight: '500', letterSpacing: '0.2em', textShadow: neonGlow }}>STATUS: CORE_NETWORK_ONLINE</div>
                        <div style={{ color: '#E2FF3D', fontSize: '13px', fontWeight: '500', letterSpacing: '0.2em', textShadow: neonGlow }}>LATENCY: 0.04ms</div>
                        <div style={{ color: '#E2FF3D', fontSize: '13px', fontWeight: '500', letterSpacing: '0.2em', textShadow: neonGlow }}>EPOCH: 0 / GENESIS</div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1100px',
                            height: '500px',
                            position: 'relative',
                        }}
                    >
                        {/* Central Power Node */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '450px',
                            height: '450px',
                            background: 'radial-gradient(circle, rgba(226, 255, 61, 0.08) 0%, transparent 70%)',
                            borderRadius: '50%',
                            display: 'flex'
                        }} />

                        {/* Primary Hooks */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            <div style={{
                                color: '#E2FF3D',
                                fontSize: '16px',
                                fontWeight: '500',
                                letterSpacing: '0.4em',
                                marginBottom: '25px',
                                textShadow: neonGlow
                            }}>
                                INCENTIVIZED GENESIS PHASE
                            </div>

                            <div style={{
                                color: 'white',
                                fontSize: '42px',
                                fontWeight: '600',
                                letterSpacing: '0.04em',
                                lineHeight: '0.9',
                                textAlign: 'center'
                            }}>
                                EARN YOUR
                            </div>
                            <div style={{
                                color: '#E2FF3D',
                                fontSize: '90px',
                                fontWeight: '700',
                                letterSpacing: '0.015em',
                                lineHeight: '0.95',
                                textAlign: 'center',
                                textShadow: neonGlow
                            }}>
                                GENESIS POINTS
                            </div>
                        </div>

                        {/* Description (Scarcity/Utility) */}
                        <div style={{
                            marginTop: '45px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            paddingTop: '35px',
                        }}>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', letterSpacing: '0.02em', textAlign: 'center', fontWeight: '400', opacity: '0.75', marginBottom: '20px' }}>
                                Early contribution defines future allocation.
                            </div>

                            {/* Action Items Bar */}
                            <div style={{
                                display: 'flex',
                                border: '1px solid rgba(226, 255, 61, 0.2)',
                                padding: '10px 40px',
                                borderRadius: '4px'
                            }}>
                                <div style={{ color: '#E2FF3D', fontSize: '14px', fontWeight: '500', letterSpacing: '0.3em', textShadow: neonGlow }}>
                                    FAUCET • STAKE • VALIDATE • CONTRIBUTE
                                </div>
                            </div>

                            {/* Scale Signal (Social Proof) */}
                            <div style={{
                                marginTop: '25px',
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '12px',
                                fontWeight: '500',
                                letterSpacing: '0.12em',
                                display: 'flex'
                            }}>
                                GENESIS PARTICIPANTS: 3,428 • ACTIVE VALIDATORS: 27
                            </div>
                        </div>
                    </div>

                    {/* Exclusivity Footer */}
                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        left: '60px',
                        right: '60px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ color: 'white', fontSize: '14px', fontWeight: '500', letterSpacing: '0.12em', opacity: '0.85', display: 'flex' }}>
                                GENESIS ACCESS GRANTED BY <span style={{ color: '#E2FF3D', marginLeft: '10px', textShadow: neonGlow }}>@{refCode}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ color: '#E2FF3D', fontSize: '20px', fontWeight: '600', letterSpacing: '0.08em', textShadow: neonGlow }}>ZUGCHAIN.ORG</div>
                            <div style={{ color: 'rgba(226, 255, 61, 0.5)', fontSize: '10px', marginTop: '2px', letterSpacing: '0.05em' }}>PROTOCOL-LEVEL L1 NETWORK</div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            },
        );
    } catch (e: any) {
        return new Response(`Failed to generate image`, { status: 500 });
    }
}
