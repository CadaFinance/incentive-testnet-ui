'use client'

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, User, Activity, Gift, Radio, ChartNoAxesColumn, Zap } from 'lucide-react'
import { useAccount } from 'wagmi'
import { formatAddress } from '@/lib/utils'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
}

interface LeaderboardEntry {
    address: string
    points: number
    total_claims: number
    rank: number
    badges: string[] // Added badges array
}

import { INSTITUTIONAL_BADGES, getUSDZMultiplier } from '@/lib/badges';

const POLLING_INTERVAL = 5000;

// Format points for mobile: 1,234,567 -> 1.2M
const formatPoints = (points: number, isMobile = false): string => {
    if (isMobile && points >= 1000000) {
        return (points / 1000000).toFixed(1) + 'M';
    }
    return points.toLocaleString();
};

// Format USDZ for mobile: 99,999+ -> XK
const formatUSDZ = (value: number, isMobile = false): string => {
    if (isMobile && value >= 100000) {
        return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Shorter mobile address: 0x1234...5678 -> 0x12...78
const formatMobileAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-2)}`;
};

export default function LeaderboardPage() {
    const { address: userAddress, isConnected } = useAccount()
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])
    const [stats, setStats] = useState<any>(null)
    const [userRank, setUserRank] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Poll Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lRes, sRes] = await Promise.all([
                    fetch('/api/incentive/leaderboard'),
                    fetch('/api/incentive/stats')
                ])
                if (lRes.ok) setLeaders(await lRes.json())
                if (sRes.ok) setStats(await sRes.json())
            } catch (e) { console.error('Failed to fetch data') }
            finally { setIsLoading(false) }
        };

        fetchData(); // Initial
        const interval = setInterval(fetchData, POLLING_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // Fetch My Rank
    useEffect(() => {
        if (isConnected && userAddress) {
            fetch(`/api/incentive/profile?address=${userAddress}`)
                .then(r => r.json())
                .then(data => setUserRank(data))
                .catch(console.error)
        } else {
            setUserRank(null)
        }
    }, [isConnected, userAddress, leaders]) // Update when leaders update

    return (
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative min-h-[80vh] pb-24 sm:pb-6">

            {/* User Rank Display - Responsive Variants */}
            <AnimatePresence>
                {isConnected && userRank && (
                    <>
                        {/* Desktop: Floating Card */}
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="hidden sm:block fixed bottom-10 right-10 z-[100] w-[300px]"
                        >
                            {/* Animated Border Container */}
                            <div className="relative p-[1px] overflow-hidden rounded-2xl">
                                <div className="absolute -inset-[200%] animate-border-spin bg-neon-conic" />
                                <div className="relative bg-[#030303]/90 backdrop-blur-xl p-6 z-10 rounded-2xl">
                                    <div className="space-y-4">
                                        {/* Header */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[8px] text-white/40 font-black uppercase tracking-[0.2em]">Your_Rank</span>
                                                <h4 className="text-4xl font-black text-white tracking-tighter tabular-nums">#{userRank.rank || '...'}</h4>
                                            </div>
                                            <div className="w-14 h-14  flex items-center justify-center">
                                                <ChartNoAxesColumn className="w-7 h-7 text-[#e2ff3d]" />
                                            </div>
                                        </div>

                                        {/* Badges Row */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {userRank.rank === 1 && <span className="text-[8px] bg-[#e2ff3d] text-black px-2 py-1 font-black uppercase">SUPREME</span>}
                                            {userRank.rank === 2 && <span className="text-[8px] bg-white text-black px-2 py-1 font-black uppercase">MASTER</span>}
                                            {userRank.rank === 3 && <span className="text-[8px] bg-[#e2ff3d]/10 text-[#e2ff3d] px-2 py-1 font-black uppercase border border-[#e2ff3d]/20">ELITE</span>}
                                            {userRank.badges?.map((badgeId: string) => {
                                                const badge = INSTITUTIONAL_BADGES[badgeId as keyof typeof INSTITUTIONAL_BADGES];
                                                if (!badge) return null;
                                                return (
                                                    <span key={badgeId} className={`text-[8px] bg-white/5 ${badge.color} px-2 py-1 font-black uppercase border border-white/10 flex items-center gap-1`}>
                                                        {badge.icon} {badge.name}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        {/* Stats */}
                                        <div className="space-y-2 pt-4 border-t border-white/5">
                                            <div className="flex items-center justify-between text-[10px] font-mono">
                                                <span className="text-[#e2ff3d] uppercase font-bold tracking-widest">$USDZ_Value</span>
                                                <span className="text-[#e2ff3d] font-black text-sm">${(parseInt(userRank.points || 0) * getUSDZMultiplier(userRank.badges)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-mono">
                                                <span className="text-white/40 uppercase font-bold tracking-widest">Wallet_ID</span>
                                                <span className="text-white/40">{formatAddress(userAddress || '')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Mobile: Professional Floating Rank Card */}
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="sm:hidden fixed bottom-1 left-1 right-1 z-[100] p-[1.5px] overflow-hidden rounded-md shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
                        >
                            {/* Rotating Border Base */}
                            <div className="absolute -inset-[300%] animate-border-spin bg-neon-conic" />

                            <div className="relative z-10 bg-[#050505] p-4 rounded-[5px]">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-start gap-2">
                                            <span className="text-4xl font-black text-[#e2ff3d] tracking-tighter leading-none">#{userRank.rank}</span>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] text-[#e2ff3d] font-bold uppercase tracking-widest leading-none mt-1">Your Rank</span>
                                                <span className="text-[10px] text-white/60 font-mono leading-none mt-2 opacity-50">{formatMobileAddress(userAddress || '')}</span>
                                            </div>
                                        </div>
                                        {/* User Badges - Icon only on mobile card */}
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {userRank.rank === 1 && <span className="w-5 h-5 bg-[#e2ff3d] rounded-full flex items-center justify-center text-[7px] font-black text-black">S</span>}
                                            {userRank.rank === 2 && <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[7px] font-black text-black">M</span>}
                                            {userRank.rank === 3 && <span className="w-5 h-5 bg-[#e2ff3d]/10 border border-[#e2ff3d]/30 rounded-full flex items-center justify-center text-[7px] font-black text-[#e2ff3d]">E</span>}
                                            {userRank.badges?.map((badgeId: string) => {
                                                const badge = INSTITUTIONAL_BADGES[badgeId as keyof typeof INSTITUTIONAL_BADGES];
                                                return badge ? <span key={badgeId} className={`w-5 h-5 bg-white/5 border border-white/10 rounded-full flex items-center justify-center ${badge.color} text-[10px]`}>{badge.icon}</span> : null;
                                            })}
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end justify-center">
                                        <div className="text-2xl font-black text-[#e2ff3d] tracking-tighter leading-none">
                                            ${(parseInt(userRank.points || 0) * getUSDZMultiplier(userRank.badges)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <span className="text-[8px] text-[#e2ff3d] font-bold uppercase tracking-widest leading-none mt-2">Estimated $USDZ</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="space-y-8 sm:space-y-12"
            >
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 pb-6 sm:pb-8 border-b border-white/[0.05]">
                    <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center gap-1.5 ">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-mono text-[7px] sm:text-[8px] font-bold tracking-widest uppercase italic text-green-500">Live Intelligence Dashboard</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                                LEADERBOARD<span className="text-[#e2ff3d]">.</span>
                            </h1>
                        </div>
                        <p className="text-white/40 text-[9px] sm:text-[10px] font-mono tracking-tight uppercase max-w-lg leading-relaxed">
                            Ranking top protocol contributors based on real-time activity metrics.
                        </p>
                    </div>

                    {/* Stats Grid - Ultra Compact Mobile Layout */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-1 max-w-xl">
                        {[
                            { label: 'Contributors', fullLabel: 'Total_Contributors', value: stats?.total_users || '...', icon: User },
                            { label: 'Airdrop_Pool', fullLabel: 'Total_Airdrop_Pool', value: stats?.total_points ? '$' + (stats.total_points * 0.01).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '...', icon: Gift },
                            { label: 'Activity', fullLabel: 'Protocol_Activity', value: stats?.total_activity || '...', icon: Activity }
                        ].map((stat, i) => (
                            <div key={i} className="p-3 sm:p-4 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col justify-between h-full min-h-[70px] sm:min-h-[80px]">
                                <div className="flex items-center justify-between opacity-30 mb-2">
                                    <stat.icon className="w-3 h-3 sm:w-3 sm:h-3 text-white" />
                                    {/* Responsive Label: Short on mobile, Long on desktop */}
                                    <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest leading-none hidden sm:block">{stat.fullLabel}</span>
                                    <span className="text-[6px] font-black uppercase tracking-widest leading-none sm:hidden">{stat.label}</span>
                                </div>
                                <p className="text-lg sm:text-xl font-bold text-white tracking-tighter tabular-nums leading-none">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Table Area - Fixed Mobile Layout */}
                <div className="w-full">
                    <motion.div variants={itemVariants} className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden p-2">
                        <div className="overflow-x-auto custom-scrollbar pb-2">
                            <table className="w-full text-left border-collapse min-w-[340px] sm:min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-white/[0.05]">
                                        <th className="py-3 sm:py-4 pl-4 pr-1 sm:px-6 text-[7px] sm:text-[8px] font-mono font-bold text-white/40 uppercase tracking-widest w-10 sm:w-24 text-left">Rank</th>
                                        <th className="py-3 sm:py-4 px-1 sm:px-6 text-[7px] sm:text-[8px] font-mono font-bold text-white/40 uppercase tracking-widest text-left">Contributor_Address</th>
                                        <th className="py-3 sm:py-4 px-2 sm:px-6 text-[7px] sm:text-[8px] font-mono font-bold text-white/40 uppercase tracking-widest text-right">Points</th>
                                        <th className="py-3 sm:py-4 px-2 sm:px-6 text-[7px] sm:text-[8px] font-mono font-bold text-[#e2ff3d] uppercase tracking-widest text-right">$USDZ</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-white/[0.02] relative">
                                    <AnimatePresence mode='popLayout'>
                                        {leaders.map((leader, i) => (
                                            <motion.tr
                                                key={leader.address}
                                                layout
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.3 }}
                                                className={`group hover:bg-white/[0.01] transition-all ${leader.badges?.includes('INSTITUTIONAL_STAKER')
                                                    ? 'inst-border bg-[#e2ff3d]/[0.02] shadow-[0_0_15px_-5px_#e2ff3d20]' // Neon Glow Hook
                                                    : userAddress?.toLowerCase() === leader.address.toLowerCase() ? 'bg-[#e2ff3d]/[0.03]' : ''
                                                    }`}
                                            >
                                                <td className="py-3 sm:py-5 pl-4 pr-1 sm:px-6">
                                                    <span className={`text-[11px] sm:text-[13px] font-mono font-black transition-colors ${Number(leader.rank) <= 3 ? 'text-[#e2ff3d]' : 'text-white/60 group-hover:text-white'}`}>#{leader.rank}</span>
                                                </td>
                                                <td className="py-3 sm:py-5 px-1 sm:px-6">
                                                    <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
                                                        <div className="hidden sm:flex w-6 h-6 rounded-full bg-white/[0.03] border border-white/5 items-center justify-center shrink-0">
                                                            <User className="w-2.5 h-2.5 text-gray-600" />
                                                        </div>
                                                        <span className={`text-[10px] sm:text-[13px] font-mono group-hover:text-white transition-colors shrink-0 ${userAddress?.toLowerCase() === leader.address.toLowerCase() ? 'text-[#e2ff3d] font-bold' : 'text-white/40'}`}>
                                                            <span className="sm:hidden">{formatMobileAddress(leader.address)}</span>
                                                            <span className="hidden sm:inline">{formatAddress(leader.address)}</span>
                                                        </span>
                                                        {/* Rank Badge inline */}
                                                        {i === 0 && <span className="h-4 text-[6px] sm:text-[8px] bg-[#e2ff3d] text-black px-1 sm:px-1.5 font-black uppercase shrink-0 flex items-center">SUPREME</span>}
                                                        {i === 1 && <span className="h-4 text-[6px] sm:text-[8px] bg-white text-black px-1 sm:px-1.5 font-black uppercase shrink-0 flex items-center">MASTER</span>}
                                                        {i === 2 && <span className="h-4 text-[6px] sm:text-[8px] bg-[#e2ff3d]/10 text-[#e2ff3d] px-1 sm:px-1.5 font-black uppercase border border-[#e2ff3d]/20 shrink-0 flex items-center">ELITE</span>}
                                                        {/* Institutional Badges inline */}
                                                        {leader.badges?.map(badgeId => {
                                                            const badge = INSTITUTIONAL_BADGES[badgeId as keyof typeof INSTITUTIONAL_BADGES];
                                                            if (!badge) return null;
                                                            return (
                                                                <span key={badgeId} className={`h-4 text-[6px] sm:text-[8px] bg-white/5 ${badge.color} px-1 sm:px-1.5 font-black uppercase border border-white/10 flex items-center gap-0.5 shrink-0`}>
                                                                    {badge.icon}
                                                                </span>
                                                            )
                                                        })}
                                                        {userAddress?.toLowerCase() === leader.address.toLowerCase() && <span className="h-4 text-[6px] sm:text-[8px] bg-white/10 text-white px-1 sm:px-1.5 font-black uppercase italic shrink-0 flex items-center">YOU</span>}
                                                    </div>
                                                </td>
                                                <td className="py-4 sm:py-5 px-2 sm:px-6 text-right">
                                                    <span className={`text-[12px] sm:text-[16px] font-black tabular-nums tracking-tighter transition-colors ${userAddress?.toLowerCase() === leader.address.toLowerCase() ? 'text-[#e2ff3d]' : 'text-white/80'}`}>
                                                        <span className="sm:hidden">{formatPoints(parseInt(leader.points as any), true)}</span>
                                                        <span className="hidden sm:inline">{formatPoints(parseInt(leader.points as any), false)}</span>
                                                    </span>
                                                </td>
                                                <td className="py-4 sm:py-5 px-1 sm:px-6 text-right">
                                                    <span className={`text-[11px] sm:text-[16px] font-black tabular-nums tracking-tighter transition-colors ${userAddress?.toLowerCase() === leader.address.toLowerCase() ? 'text-[#e2ff3d]' : 'text-[#e2ff3d]/60'}`}>
                                                        <span className="sm:hidden">{formatUSDZ(parseInt(leader.points as any) * getUSDZMultiplier(leader.badges), true)}</span>
                                                        <span className="hidden sm:inline">{formatUSDZ(parseInt(leader.points as any) * getUSDZMultiplier(leader.badges), false)}</span>
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>

                                    {leaders.length === 0 && !isLoading && (
                                        <tr>
                                            <td colSpan={3} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                    <Zap className="w-8 h-8" />
                                                    <p className="text-[10px] font-mono uppercase tracking-[0.2em]">System_Syncing...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
}
