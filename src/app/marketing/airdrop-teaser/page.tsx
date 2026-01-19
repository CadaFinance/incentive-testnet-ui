'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Matrix Code Rain Component ---
const CodeRain = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const fontSize = 16;
        const columns = Math.floor(canvas.width / fontSize);
        const drops = new Array(columns).fill(1);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@&*%';

        // Throttling for Matrix Effect style (don't update every single frame, maybe every 2nd or 3rd)
        let lastTime = 0;
        const fps = 30;
        const interval = 1000 / fps;

        const draw = (currentTime: number) => {
            animationFrameId = requestAnimationFrame(draw);

            const deltaTime = currentTime - lastTime;
            if (deltaTime < interval) return;

            lastTime = currentTime - (deltaTime % interval);

            // Semi-transparent black to create trailing effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#e2ff3d'; // Zugchain Neon Green
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        draw(0);

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 opacity-20 pointer-events-none" />;
};

// --- Terminal Text Sequencer ---
const TerminalLog = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const sequence = [
        "> INITIALIZING INCENTIVE_LAYER_V1...",
        "> SYNCING SHARD_NODES (N=256)...",
        "> LOADING GENESIS_PROTOCOL...",
        "> STATUS: RECORDING_ACTIVE",
        "> ACCESS: GRANTED",
    ];

    useEffect(() => {
        sequence.forEach((text, i) => {
            setTimeout(() => {
                setLogs(prev => [...prev, text]);
            }, (i + 1) * 800);
        });
    }, []);

    return (
        <div className="absolute top-10 left-10 font-mono text-[#e2ff3d] text-sm md:text-base space-y-1">
            {logs.map((log, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                >
                    <span className="shrink-0">{log}</span>
                    {i === logs.length - 1 && (
                        <motion.div
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="w-2 h-4 bg-[#e2ff3d]"
                        />
                    )}
                </motion.div>
            ))}
        </div>
    );
};

// --- 3D Genesis Pass Component ---
const GenesisPass = () => {
    const cardContent = (isBack = false) => (
        <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#050505] to-[#111] border border-[#e2ff3d]/40 rounded-[32px] shadow-[0_0_100px_rgba(0,0,0,1)]"
            style={{
                backfaceVisibility: 'hidden',
                transform: `${isBack ? 'rotateY(180deg)' : 'rotateY(0deg)'} translateZ(1px)`,
                WebkitBackfaceVisibility: 'hidden'
            }}
        >
            {/* Decorative Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#e2ff3d 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {/* Official Zug Logo */}
            <div className="mb-12 relative w-32 h-32 flex items-center justify-center">
                <img
                    src="/zug_logo.svg"
                    alt="ZugChain Logo"
                    className="w-full h-auto drop-shadow-[0_0_15px_rgba(226,255,61,0.5)]"
                />
                <div className="absolute -inset-8 border-4 border-[#e2ff3d]/20 rounded-full animate-ping" />
            </div>

            <div className="text-center relative z-10">
                <h1 className="text-white font-bold tracking-[0.3em] text-4xl mb-4">ZUGCHAIN</h1>
                <p className="text-[#e2ff3d] font-mono text-sm tracking-[0.5em] opacity-80 uppercase">Incentive Testnet</p>
            </div>

            <div className="absolute bottom-10 left-0 right-0 px-8 flex justify-between items-end opacity-40">
                <div className="font-mono text-[8px] text-white uppercase tracking-tighter">PROT_ID: 001-ALPHA</div>
                <div className="font-mono text-[8px] text-white uppercase tracking-tighter">LVL: GENESIS</div>
            </div>
        </div>
    );

    return (
        <div className="perspective-1000 w-[420px] h-[600px]">
            <motion.div
                className="relative w-full h-full"
                style={{
                    transformStyle: 'preserve-3d',
                    willChange: 'transform'
                }}
                initial={{ rotateY: 0, opacity: 0, scale: 0.8 }}
                animate={{
                    rotateY: 360,
                    opacity: 1,
                    scale: 1,
                }}
                transition={{
                    rotateY: { repeat: Infinity, duration: 8, ease: "linear" },
                    opacity: { duration: 1.5 },
                    scale: { duration: 1 },
                }}
            >
                {/* Front Face */}
                {cardContent(false)}

                {/* Back Face */}
                {cardContent(true)}
            </motion.div>
        </div>
    );
};

// --- Minimal Data Dashboard ---
const DataDashboard = () => {
    const [stats, setStats] = useState({
        block: 824842,
        tps: 102450
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                block: prev.block + 1,
                tps: 100000 + Math.floor(Math.random() * 2000)
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const StatBox = ({ label, value }: { label: string, value: any }) => (
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl p-4 rounded-xl min-w-[160px]">
            <div className="text-[10px] text-[#e2ff3d]/60 font-mono uppercase tracking-[0.3em] mb-1">{label}</div>
            <div className="text-xl font-mono text-white/90 font-medium tracking-tighter">{value.toLocaleString()}</div>
        </div>
    );

    return (
        <div className="flex gap-6">
            <StatBox label="Protocol Height" value={stats.block} />
            <StatBox label="Network Load" value={stats.tps} />
        </div>
    );
};

// --- Subtle Sync Bar ---
const SyncProgressBar = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => (prev < 100 ? prev + 0.05 : 100));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden z-[110]">
            <motion.div
                className="h-full bg-[#e2ff3d] shadow-[0_0_15px_#e2ff3d]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
            />
            <div className="absolute bottom-6 right-12 text-[9px] font-mono text-[#e2ff3d]/50 uppercase tracking-[0.5em] font-light">
                Secure Protocol Sync: {progress.toFixed(2)}%
            </div>
        </div>
    );
};

export default function AirdropTeaser() {
    const [stage, setStage] = useState<'init' | 'reveal' | 'ready'>('init');

    useEffect(() => {
        const t1 = setTimeout(() => setStage('reveal'), 2500);
        const t2 = setTimeout(() => setStage('ready'), 4500);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden">
            {/* Background Matrix - Low Opacity for Premium Feel */}
            <div className="opacity-40">
                <CodeRain />
            </div>

            {/* Subtle Scanlines */}
            <div className="absolute inset-0 pointer-events-none z-[100] opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

            {/* Top Terminals */}
            <TerminalLog />
            <div className="absolute top-12 right-12 text-right space-y-2 opacity-60">
                <div className="text-[#e2ff3d] font-mono text-[10px] uppercase tracking-widest border border-[#e2ff3d]/20 px-3 py-1 rounded">
                    Auth: Node_Sec_Alpha_01
                </div>
                <div className="text-white/30 font-mono text-[9px] uppercase tracking-[0.3em]">
                    Region: Zurich // GMT+1
                </div>
            </div>

            {/* Center Content */}
            <AnimatePresence>
                {stage !== 'init' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(30px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        className="relative z-10 flex flex-col items-center gap-16"
                    >
                        <GenesisPass />

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: stage === 'ready' ? 1 : 0, y: stage === 'ready' ? 0 : 10 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/10 px-10 py-5 rounded-full backdrop-blur-2xl">
                                <div className="w-2 h-2 bg-[#e2ff3d] rounded-full animate-pulse shadow-[0_0_15px_#e2ff3d]" />
                                <span className="text-white font-mono text-lg tracking-[0.4em] uppercase font-bold">Genesis Access Open</span>
                            </div>
                            <div className="text-white/20 font-mono text-[9px] uppercase tracking-[0.8em] font-light">Contribution Phase Active</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Technical Sub-Layer (Reveals Last) */}
            <AnimatePresence>
                {stage === 'ready' && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1.5, delay: 0.5 }}
                            className="fixed bottom-12 left-12 z-[110]"
                        >
                            <DataDashboard />
                        </motion.div>
                        <SyncProgressBar />
                    </>
                )}
            </AnimatePresence>

            {/* Reset / Recording Trigger */}
            <button
                onClick={() => window.location.reload()}
                className="absolute top-6 left-1/2 -translate-x-1/2 text-white/5 hover:text-[#e2ff3d]/30 text-[9px] font-mono transition-colors uppercase tracking-[1.5em] z-[120]"
            >
                [ RESET_PROTOCOL ]
            </button>

            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1200px;
                }
                /* Hide Next.js Dev Tools */
                #nextjs-portal, 
                [data-nextjs-toast-wrapper], 
                [data-nextjs-feedback-icon],
                #nextjs-static-indicator {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
