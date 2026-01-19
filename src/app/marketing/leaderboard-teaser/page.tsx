'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

// --- Types ---
interface Contributor {
    id: string;
    rank: number;
    address: string;
    points: number;
    isElite?: boolean;
    isCurrent?: boolean;
}

// --- Animated Counter Component ---
const Counter = ({ value, duration = 2 }: { value: number; duration?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        const increment = end / (duration * 60);

        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(start));
            }
        }, 1000 / 60);

        return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{displayValue.toLocaleString()}</span>;
};

// --- Stat Box Component ---
const StatBox = ({ label, value, iconType }: { label: string; value: number; iconType: string }) => (
    <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-lg flex-1 min-w-[200px] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#e2ff3d] opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">{label}</span>
            <div className="text-2xl font-mono text-white font-bold">
                <Counter value={value} />
            </div>
        </div>
        {/* Subtle background icon/pattern */}
        <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none text-4xl">
            {iconType === 'users' && '👥'}
            {iconType === 'points' && '💫'}
            {iconType === 'activity' && '⚡'}
        </div>
    </div>
);

// --- Leaderboard Row Component ---
const LeaderboardRow = ({ item }: { item: Contributor }) => (
    <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{
            opacity: 1,
            x: 0,
            backgroundColor: item.isCurrent ? 'rgba(226, 255, 61, 0.05)' : 'transparent',
            borderColor: item.isCurrent ? 'rgba(226, 255, 61, 0.3)' : 'rgba(255, 255, 255, 0.05)'
        }}
        className={`flex items-center justify-between p-4 border-b transition-colors group ${item.isCurrent ? 'border-[#e2ff3d]/30' : 'border-white/5'
            }`}
    >
        <div className="flex items-center gap-8">
            <div className={`w-8 font-mono text-sm ${item.rank <= 3 ? 'text-[#e2ff3d] font-bold' : 'text-white/40'}`}>
                #{item.rank}
            </div>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-white/20 border border-white/10 group-hover:border-[#e2ff3d]/30 transition-colors">
                    👤
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-white/80 font-mono text-sm">{item.address}</span>
                    {item.isElite && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e2ff3d]/10 text-[#e2ff3d] font-mono border border-[#e2ff3d]/20 uppercase">Elite</span>
                    )}
                </div>
            </div>
        </div>
        <div className="text-right">
            <div className={`font-mono ${item.isCurrent ? 'text-[#e2ff3d] font-bold' : 'text-white/80'}`}>
                {item.isCurrent ? <Counter value={item.points} duration={3} /> : item.points.toLocaleString()}
            </div>
        </div>
    </motion.div>
);

export default function LeaderboardTeaser() {
    const [animationStage, setAnimationStage] = useState<'idle' | 'starting' | 'counting' | 'moving' | 'final'>('idle');

    // Initial data
    const [contributors, setContributors] = useState<Contributor[]>([
        { id: '1', rank: 1, address: '0xc235...cdfb', points: 22112220, isElite: true },
        { id: '2', rank: 2, address: '0x151b...3fae', points: 33276, isElite: true },
        { id: '3', rank: 3, address: '0xde6e...8972', points: 32659, isElite: true },
        { id: '4', rank: 4, address: '0xfe61...4e61', points: 29850 },
        { id: '5', rank: 5, address: '0x436f...a18c', points: 29850 },
        { id: '6', rank: 6, address: '0x184d...6a5e', points: 29850 },
        { id: '7', rank: 7, address: '0x371cf...518e', points: 29636, isCurrent: true },
        { id: '8', rank: 8, address: '0xbdba5...ae2b', points: 29550 },
        { id: '9', rank: 9, address: '0x92b7...f6a8', points: 28682 },
        { id: '10', rank: 10, address: '0xba65...4351', points: 27400 },
    ]);

    useEffect(() => {
        // --- Animation Timeline ---

        // Stage 1: Counting Points (Self)
        const t1 = setTimeout(() => {
            setAnimationStage('counting');
            setContributors(prev => prev.map(c =>
                c.isCurrent ? { ...c, points: 50000 } : c
            ));
        }, 3000);

        // Stage 2: Move Up
        const t2 = setTimeout(() => {
            setAnimationStage('moving');
            setContributors(prev => {
                const current = prev.find(c => c.isCurrent)!;
                const rest = prev.filter(c => !c.isCurrent);
                // Target slot: Rank 2
                const newOrder = [
                    rest[0], // Rank 1
                    { ...current, rank: 2 }, // Target Rank 2
                    ...rest.slice(1).map((c, i) => ({ ...c, rank: i + 3 }))
                ];
                return newOrder;
            });
        }, 7000);

        // Stage 3: Final Glow
        const t3 = setTimeout(() => {
            setAnimationStage('final');
        }, 9000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black text-white font-sans overflow-hidden flex flex-col items-center py-20 px-4 md:px-20">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(226, 255, 61, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(226, 255, 61, 0.05) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />
            {/* Radial glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#e2ff3d]/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-6xl relative z-10 flex flex-col gap-12">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2"
                        >
                            <div className="w-2 h-2 rounded-full bg-[#11ff88] shadow-[0_0_10px_#11ff88]" />
                            <span className="text-[#11ff88] font-mono text-[10px] uppercase tracking-[0.4em] font-bold">Live Data Transmission</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-7xl font-bold tracking-tighter uppercase"
                        >
                            Leaderboard<span className="text-[#e2ff3d]">_</span>
                        </motion.h1>
                        <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.2em]">
                            Ranking top protocol contributors based on real-time activity metrics.
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex gap-4 w-full md:w-auto"
                    >
                        <StatBox label="Total Contributors" value={610} iconType="users" />
                        <StatBox label="Network Points" value={22698296} iconType="points" />
                        <StatBox label="Protocol Activity" value={18390} iconType="activity" />
                    </motion.div>
                </div>

                {/* Leaderboard Table */}
                <div className="bg-[#050505] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Table Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10">
                        <div className="flex items-center gap-12">
                            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest min-w-[32px]">Rank</span>
                            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Contributor Address</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Points</span>
                    </div>

                    {/* Table Rows */}
                    <div className="min-h-[600px]">
                        <AnimatePresence mode="popLayout">
                            {contributors.map((item) => (
                                <LeaderboardRow key={item.id} item={item} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Automation Alert */}
                <AnimatePresence>
                    {animationStage === 'final' && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#e2ff3d] text-black px-8 py-3 rounded-full font-mono text-sm font-black uppercase tracking-widest shadow-[0_0_30px_#e2ff3d]"
                        >
                            Rank Progression Secured
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Hidden Controls */}
            <div className="fixed top-5 right-5 flex gap-2 z-[100]">
                <button
                    onClick={() => window.location.reload()}
                    className="text-white/10 hover:text-[#e2ff3d] text-[10px] font-mono uppercase tracking-widest transition-colors"
                >
                    [ Restart_Sim ]
                </button>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@500;700&display=swap');
                
                body {
                    background-color: black;
                }
            `}</style>
        </div>
    );
}
