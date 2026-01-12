'use client'

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, User, Activity, Zap, Radio } from 'lucide-react'
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
}

const POLLING_INTERVAL = 5000;

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
                            className="hidden sm:block fixed bottom-10 right-10 z-[100] p-6 inst-border bg-[#050505] shadow-2xl shadow-[#e2ff3d]/10 w-[280px]"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="space-y-0.5">
                                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Contributor_Status</span>
                                        <h4 className="text-3xl font-black text-white tracking-tighter tabular-nums">#{userRank.rank || '...'}</h4>
                                    </div>
                                    <div className="w-12 h-12 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 flex items-center justify-center">
                                        <Activity className="w-6 h-6 text-[#e2ff3d]" />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-gray-600 uppercase font-bold tracking-widest">Protocol_Points</span>
                                        <span className="text-white font-black">{parseInt(userRank.points || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-gray-600 uppercase font-bold tracking-widest">Verification_ID</span>
                                        <span className="text-white/40">{formatAddress(userAddress || '')}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Mobile: Sticky Bottom Bar */}
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#050505] border-t border-[#e2ff3d]/20 p-4 safe-area-pb"
                        >
                            <div className="flex items-center justify-between max-w-sm mx-auto">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 flex items-center justify-center">
                                        <span className="text-[#e2ff3d] font-black text-lg">#{userRank.rank}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-[#e2ff3d] font-bold uppercase tracking-widest">Global Rank</span>
                                        <span className="text-[9px] text-gray-500 font-mono tracking-wider">{formatAddress(userAddress || '')}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-white tracking-tighter leading-none">{parseInt(userRank.points || 0).toLocaleString()}</div>
                                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.2em] block mt-0.5">Points</span>
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
                                LEADERBOARD<span className="text-[#e2ff3d]">_</span>
                            </h1>
                        </div>
                        <p className="text-gray-500 text-[9px] sm:text-[10px] font-mono tracking-tight uppercase max-w-lg leading-relaxed">
                            Ranking top protocol contributors based on real-time activity metrics.
                        </p>
                    </div>

                    {/* Stats Grid - Ultra Compact Mobile Layout */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-1 max-w-xl">
                        {[
                            { label: 'Contributors', fullLabel: 'Total_Contributors', value: stats?.total_users || '...', icon: User },
                            { label: 'Net_Points', fullLabel: 'Network_Points', value: stats?.total_points?.toLocaleString() || '...', icon: Zap },
                            { label: 'Activity', fullLabel: 'Protocol_Activity', value: stats?.total_activity || '...', icon: Activity }
                        ].map((stat, i) => (
                            <div key={i} className="p-3 sm:p-4 bg-white/[0.01] border border-white/5 rounded-sm flex flex-col justify-between h-full min-h-[70px] sm:min-h-[80px]">
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
                    <motion.div variants={itemVariants} className="inst-border bg-[#050505]/50 overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar pb-2">
                            <table className="w-full text-left border-collapse min-w-[340px] sm:min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                                        <th className="py-3 sm:py-4 px-3 sm:px-6 text-[7px] sm:text-[8px] font-mono font-bold text-gray-600 uppercase tracking-widest w-16 sm:w-24 text-center">Rank</th>
                                        <th className="py-3 sm:py-4 px-3 sm:px-6 text-[7px] sm:text-[8px] font-mono font-bold text-gray-600 uppercase tracking-widest pl-6 sm:pl-6 text-center sm:text-left">Contributor_Address</th>
                                        <th className="py-3 sm:py-4 px-3 sm:px-6 text-[7px] sm:text-[8px] font-mono font-bold text-gray-600 uppercase tracking-widest text-right">Points</th>
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
                                                className={`group hover:bg-white/[0.01] transition-all ${userAddress?.toLowerCase() === leader.address.toLowerCase() ? 'bg-[#e2ff3d]/[0.03]' : ''}`}
                                            >
                                                <td className="py-4 sm:py-5 px-3 sm:px-6">
                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                                        <span className={`text-[12px] sm:text-[13px] font-mono font-black transition-colors ${Number(leader.rank) <= 3 ? 'text-[#e2ff3d]' : 'text-gray-600 group-hover:text-white'}`}>#{leader.rank}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 sm:py-5 px-3 sm:px-6">
                                                    <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                                                        <div className="hidden sm:flex w-6 h-6 rounded-full bg-white/[0.03] border border-white/5 items-center justify-center">
                                                            <User className="w-2.5 h-2.5 text-gray-600" />
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                            <span className={`text-[12px] sm:text-[13px] font-mono group-hover:text-white transition-colors ${userAddress?.toLowerCase() === leader.address.toLowerCase() ? 'text-[#e2ff3d] font-bold' : 'text-white/40'}`}>
                                                                {formatAddress(leader.address)}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                {i < 3 && <span className="text-[7px] sm:text-[8px] bg-[#e2ff3d]/10 text-[#e2ff3d] px-1.5 sm:px-2 py-0.5 font-black uppercase tracking-tighter border border-[#e2ff3d]/20 rounded-[1px]">Elite</span>}
                                                                {userAddress?.toLowerCase() === leader.address.toLowerCase() && <span className="text-[7px] sm:text-[8px] bg-white/10 text-white px-1.5 sm:px-2 py-0.5 font-black uppercase tracking-tighter italic border border-white/20 rounded-[1px]">YOU</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 sm:py-5 px-3 sm:px-6 text-right">
                                                    <span className={`text-[13px] sm:text-[16px] font-black tabular-nums tracking-tighter transition-colors ${userAddress?.toLowerCase() === leader.address.toLowerCase() ? 'text-[#e2ff3d]' : 'text-white'}`}>
                                                        {parseInt(leader.points as any).toLocaleString()}
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
