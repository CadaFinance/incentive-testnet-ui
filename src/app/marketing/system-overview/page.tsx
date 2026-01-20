'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Users, Target, Activity, CheckCircle2, ArrowRight, Lock, Unlock } from 'lucide-react';

// --- Types ---
type Scene = 'auth' | 'referral' | 'final';

// --- Animated Counter (High Precision) ---
const Odometer = ({ value, duration = 2, prefix = '', suffix = '', decimals = 0 }: { value: number, duration?: number, prefix?: string, suffix?: string, decimals?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = displayValue;
        const end = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = (currentTime - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out expo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const current = start + (end - start) * easeProgress;
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return (
        <span className="tabular-nums">
            {prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
        </span>
    );
};

// --- Scene Components ---

const TechnicalLogs = ({ logs }: { logs: string[] }) => (
    <div className="absolute top-12 left-12 font-mono text-xs text-[#e2ff3d]/60 space-y-2 z-50 bg-black/40 backdrop-blur-md p-4 rounded-lg">
        {logs.slice(-8).map((log, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
            >
                <span className="text-[#e2ff3d]/30 font-bold">//</span>
                <span className="tracking-wider uppercase">{log}</span>
            </motion.div>
        ))}
    </div>
);

const ReferralNotification = ({ id, index }: { id: string, index: number }) => (
    <motion.div
        initial={{ opacity: 0, x: 50, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="bg-black/90 border-l-[6px] border-[#e2ff3d] backdrop-blur-2xl p-6 w-80 shadow-2xl flex items-center gap-6 relative overflow-hidden"
        style={{ marginBottom: '16px' }}
    >
        <div className="absolute inset-0 bg-[#e2ff3d]/10 animate-pulse" />
        <div className="bg-[#e2ff3d] p-3 rounded-none">
            <Users className="w-6 h-6 text-black" />
        </div>
        <div className="flex flex-col">
            <span className="text-sm font-mono text-[#e2ff3d] font-black uppercase tracking-[0.2em]">New Referral</span>
            <span className="text-[11px] font-mono text-white/80 font-bold">ID: {id}</span>
            <span className="text-sm font-mono text-[#11ff88] font-black mt-1">+250 PTS</span>
        </div>
    </motion.div>
);

export default function SystemOverviewTeaser() {
    const [scene, setScene] = useState<Scene>('auth');
    const [points, setPoints] = useState(500);
    const [logs, setLogs] = useState<string[]>(['Initializing System...', 'Kernel_v1.0.4 Online']);
    const [isCopied, setIsCopied] = useState(false);
    const [activeInvites, setActiveInvites] = useState(0);
    const [notifications, setNotifications] = useState<{ id: string, key: number }[]>([]);

    const usdz = useMemo(() => points * 0.0025, [points]);

    useEffect(() => {
        // --- Cinematic Timeline ---

        // 1. Auth Scene (0-4s)
        const t1 = setTimeout(() => {
            setLogs(prev => [...prev, 'Identity_Detected: 0x453...6f1', 'Protocol_Access: GRANTED']);
        }, 1500);

        // 2. Referral / Mission Control Scene (4-15s)
        const t2 = setTimeout(() => {
            setScene('referral');
            setLogs(prev => [...prev, 'Accessing_Mission_Control...', 'Referral_Link_Active']);
        }, 4000);

        const t2_copy = setTimeout(() => {
            setIsCopied(true);
            setLogs(prev => [...prev, 'Referral_Link_Copied: ZUG-GS8RM4V3']);
        }, 6500);


        // --- INVITE SURGE SIMULATION (FAST-PACED) ---
        const t_surge_start = setTimeout(() => {
            setLogs(prev => [...prev, 'Establishing_Inbound_Streams...']);
        }, 7500);

        // Simulate 12 invites rolling in faster (every 350ms)
        const inviteTimers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(id => {
            return setTimeout(() => {
                const refId = `ID_${Math.floor(Math.random() * 9000) + 1000}`;
                setActiveInvites(id);
                setPoints(500 + (id * 250)); // 500 Base + 250 per invite
                setLogs(prev => [...prev, `New_Referral_Confirmed: #${refId}`]);

                // Add Notification
                setNotifications(prev => [...prev.slice(-3), { id: refId, key: Date.now() + id }]);
            }, 7500 + (id * 350));
        });

        // 3. Final Branding (13s+)
        const t_final = setTimeout(() => {
            setNotifications([]); // Clear for clean ending
            setScene('final');
            setLogs(prev => [...prev, 'Growth_Sequence_Complete.', 'ZugChain_Network_Expanded']);
        }, 13000);

        return () => {
            [t1, t2, t2_copy, t_surge_start, t_final, ...inviteTimers].forEach(clearTimeout);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black text-white font-sans overflow-hidden flex items-center justify-center">
            {/* Background Grid & FX */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(226, 255, 61, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(226, 255, 61, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#e2ff3d]/[0.02] blur-[250px] rounded-full pointer-events-none" />

            {/* Technical HUD */}
            <TechnicalLogs logs={logs} />

            {/* Top Right Status */}
            <div className="absolute top-12 right-12 text-right font-mono z-50">
                <div className="text-[10px] text-white/30 uppercase tracking-[0.5em] mb-2 font-bold">Sequence_Status</div>
                <div className="text-[#e2ff3d] text-lg font-black uppercase tracking-widest flex items-center gap-3 justify-end">
                    <span className="w-3 h-3 rounded-full bg-[#11ff88] animate-pulse" />
                    {scene.replace('_', ' ')} phase
                </div>
            </div>

            {/* Persistent Global Wallet / Stats (Reveals after auth) */}
            <AnimatePresence>
                {scene === 'referral' && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="fixed top-0 left-0 right-0 h-40 flex items-center justify-center pointer-events-none z-40"
                    >
                        <div className="flex gap-20 bg-black border border-white/10 backdrop-blur-3xl px-16 py-10 rounded-b-[60px] shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
                            <div className="flex flex-col">
                                <span className="text-[11px] text-white/40 font-mono uppercase tracking-[0.3em] mb-2 font-bold">Total_Contribution</span>
                                <div className="text-6xl font-black text-white leading-none tracking-tighter">
                                    <Odometer value={points} suffix=" PTS" />
                                </div>
                            </div>
                            <div className="w-px h-16 bg-white/10 self-center" />
                            <div className="flex flex-col">
                                <span className="text-[11px] text-[#e2ff3d]/60 font-mono uppercase tracking-[0.3em] mb-2 font-bold">Yield_Estimated</span>
                                <div className="text-6xl font-black text-[#e2ff3d] leading-none tracking-tighter">
                                    <Odometer value={usdz} prefix="$" decimals={2} suffix=" USDZ" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Stage */}
            <div className="relative z-10 w-full max-w-4xl h-[500px] flex items-center justify-center">
                <AnimatePresence mode="wait">

                    {/* Scene 1: Auth (Restricted Access) */}
                    {scene === 'auth' && (
                        <motion.div
                            key="auth"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
                            className="relative flex flex-col items-center"
                        >
                            {/* Background Restricted Pattern */}
                            <div className="absolute -inset-40 opacity-[0.03] pointer-events-none select-none overflow-hidden flex items-center justify-center">
                                <div className="text-[200px] font-black uppercase leading-none text-white whitespace-nowrap">RESTRICTED RESTRICTED RESTRICTED</div>
                            </div>

                            <div className="relative z-10 bg-[#080808] border border-white/10 p-16 rounded-sm w-[560px] shadow-[0_50px_100px_rgba(0,0,0,1)] text-center space-y-12">
                                <div className="space-y-4">
                                    <h2 className="text-7xl font-black uppercase tracking-tighter leading-none text-white italic">
                                        RESTRICTED<br />
                                        <span className="text-[#e2ff3d]">ACCESS.</span>
                                    </h2>
                                    <div className="text-[#e2ff3d]/60 font-mono text-xs uppercase tracking-[0.5em] font-black">
                                        ACTIVE // AUTH_REQUIRED
                                    </div>
                                </div>

                                <div className="w-20 h-px bg-[#e2ff3d]/30 mx-auto" />

                                <p className="text-white/60 font-mono text-xs leading-relaxed uppercase tracking-widest px-8">
                                    Mission Control requires a secure cryptographic link. Connect your authorized wallet to access network statistics and distribution tasks.
                                </p>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="pt-6"
                                >
                                    <motion.button
                                        className="relative w-full bg-[#e2ff3d] text-black font-mono font-black py-6 rounded-sm text-xl uppercase tracking-[0.3em] overflow-hidden"
                                        animate={{
                                            boxShadow: [
                                                '0 0 0px rgba(226, 255, 61, 0)',
                                                '0 0 40px rgba(226, 255, 61, 0.4)',
                                                '0 0 0px rgba(226, 255, 61, 0)'
                                            ]
                                        }}
                                        transition={{
                                            duration: 2.5,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {/* Premium Sweep Effect */}
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                            animate={{
                                                x: ['-100%', '200%']
                                            }}
                                            transition={{
                                                duration: 1.2,
                                                repeat: Infinity,
                                                repeatDelay: 2,
                                                ease: "circOut"
                                            }}
                                            style={{ skewX: -20 }}
                                        />
                                        <span className="relative z-10">[ CONNECT WALLET ]</span>
                                    </motion.button>
                                </motion.div>

                                <div className="flex justify-between items-center text-[7px] font-mono text-white/20 uppercase tracking-widest pt-4">
                                    <span>// SECURE_DATA</span>
                                    <span>// ASSET_SYNC</span>
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {/* Scene 3: Mission Control (Referral) */}
                    {scene === 'referral' && (
                        <motion.div
                            key="referral"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02, filter: 'blur(20px)' }}
                            className="w-full max-w-6xl flex flex-col gap-8"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-[2px] bg-red-500" />
                                        <span className="text-red-500 font-mono text-xs uppercase tracking-[0.4em] font-black">Identity // Unverified</span>
                                    </div>
                                    <h1 className="text-[120px] font-black text-white leading-[0.85] tracking-tighter italic">
                                        MISSION<br />
                                        <span className="text-white/20">CONTROL.</span>
                                    </h1>
                                    <div className="bg-white/[0.03] border border-white/10 p-8 rounded-sm w-80 space-y-3 mt-12">
                                        <div className="text-xs text-white/40 font-mono uppercase tracking-[0.3em] font-bold">Active Invites</div>
                                        <div className="text-6xl font-black text-[#e2ff3d] tracking-tighter">
                                            <Odometer value={activeInvites} duration={0.5} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-[#0A0A0A] border border-white/15 p-10 rounded-sm w-[480px] space-y-10 shadow-2xl">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-6">
                                            <div className="text-xs font-mono text-white/40 uppercase tracking-[0.3em] font-bold">
                                                Scout — <span className="text-white">Vanguard</span>
                                            </div>
                                            <div className="text-xs bg-[#e2ff3d]/10 text-[#e2ff3d] px-3 py-1 font-black border border-[#e2ff3d]/20 uppercase">1x Boost</div>
                                        </div>

                                        <div className="flex items-baseline gap-6">
                                            <div className="text-[120px] font-black text-white tracking-widest leading-none italic">
                                                <Odometer value={points} />
                                            </div>
                                            <div className="text-xl font-mono font-black text-white/20 rotate-90 origin-left">XP</div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="h-2 bg-white/5 w-full rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((points / 5000) * 100, 100)}%` }}
                                                    className="h-full bg-[#e2ff3d]"
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] font-mono text-white/30 uppercase tracking-[0.4em] font-black">
                                                <span>Yield_Rate: 1x</span>
                                                <span>Progress: {Math.min(Math.floor((points / 5000) * 100), 100)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-sm w-[480px] flex items-center justify-between gap-6">
                                        <div className="flex-1 font-mono text-sm text-white/60 overflow-hidden truncate tracking-tight">
                                            http://localhost:3000/?ref=ZUG-GS8RM4V3
                                        </div>
                                        <motion.button
                                            className="relative font-mono font-black py-5 px-10 text-xs uppercase tracking-[0.2em] text-black overflow-hidden"
                                            animate={{
                                                backgroundColor: isCopied ? '#11ff88' : '#e2ff3d',
                                                boxShadow: isCopied
                                                    ? '0 0 40px rgba(17,255,136,0.6)'
                                                    : [
                                                        '0 0 0px rgba(226, 255, 61, 0)',
                                                        '0 0 25px rgba(226, 255, 61, 0.3)',
                                                        '0 0 0px rgba(226, 255, 61, 0)'
                                                    ]
                                            }}
                                            transition={{
                                                duration: isCopied ? 0.3 : 2,
                                                repeat: isCopied ? 0 : Infinity,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            {!isCopied && (
                                                <motion.div
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                                    animate={{ x: ['-100%', '200%'] }}
                                                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 1.5 }}
                                                    style={{ skewX: -20 }}
                                                />
                                            )}
                                            <span className="relative z-10">
                                                {isCopied ? '[ COPIED! ]' : '[ COPY ]'}
                                            </span>
                                        </motion.button>
                                    </div>
                                    <div className="flex justify-between text-[7px] font-mono text-white/10 uppercase tracking-[0.3em]">
                                        <span>// SECURE_SHARE_AUTH</span>
                                        <span>VALID_MODE</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Scene 5: Final */}
                    {scene === 'final' && (
                        <motion.div
                            key="final"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-16"
                        >
                            <div className="flex flex-col items-center gap-6">
                                <motion.img
                                    src="/zug_logo.svg"
                                    alt="ZugChain"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="w-48 h-48 drop-shadow-[0_0_50px_rgba(226,255,61,0.5)]"
                                />
                                <motion.h1
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-9xl font-black tracking-tighter uppercase italic"
                                >
                                    ZUGCHAIN<span className="text-[#e2ff3d]">_</span>
                                </motion.h1>
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col items-center gap-6 text-center"
                            >
                                <div className="text-4xl font-black tracking-[0.4em] uppercase italic">Contribute. Earn. Secure.</div>
                                <div className="text-[#e2ff3d] font-mono text-xl tracking-[0.6m] uppercase font-black">Incentive Testnet Now Live</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="bg-white/10 border border-white/20 px-12 py-5 rounded-full font-mono text-xl text-[#e2ff3d] tracking-widest font-black shadow-[0_0_30px_rgba(226,255,61,0.2)]"
                            >
                                testnet.zugchain.com
                            </motion.div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Final Overlay Glow */}
            <motion.div
                animate={{
                    opacity: scene === 'final' ? 0.05 : 0
                }}
                className="fixed inset-0 bg-[#e2ff3d] blur-[300px] pointer-events-none z-0"
            />

            {/* Control Bar (Hidden) */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-[100] opacity-0 hover:opacity-100 transition-opacity">
                <button
                    onClick={() => window.location.reload()}
                    className="bg-white/5 hover:bg-white/10 text-white/20 hover:text-[#e2ff3d] px-6 py-2 rounded-full font-mono text-[9px] uppercase tracking-widest transition-all"
                >
                    [ Sequence_Restart ]
                </button>
            </div>

            {/* Notifications Stack */}
            {scene !== 'final' && (
                <div className="fixed bottom-12 right-12 z-[100] flex flex-col items-end">
                    <AnimatePresence>
                        {notifications.map((note, i) => (
                            <ReferralNotification key={note.key} id={note.id} index={i} />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
                
                body {
                    background-color: black;
                    font-family: 'Outfit', sans-serif;
                    -webkit-font-smoothing: antialiased;
                }

                .font-mono {
                    font-family: 'JetBrains Mono', monospace;
                }

                /* Hide Next.js Dev Tools */
                #nextjs-portal, 
                [data-nextjs-toast-wrapper], 
                [data-nextjs-feedback-icon],
                #nextjs-static-indicator,
                [data-nextjs-indicator],
                #__next-build-watcher {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
            `}</style>
        </div >
    );
}
