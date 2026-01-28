'use client';

export const dynamic = 'force-dynamic';
import { useEffect, useState, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/MissionControl/DashboardLayout';
import { StreakTracker } from '@/components/MissionControl/StreakTracker';
import { MissionCard } from '@/components/MissionControl/MissionCard';
import { LegacyClaimModal } from '@/components/MissionControl/LegacyClaimModal';
import StreakSuccessModal from '@/components/MissionControl/StreakSuccessModal';
import { TelegramVerifyModal } from '@/components/TelegramVerifyModal';
import { InviteMilestones } from '@/components/MissionControl/InviteMilestones';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { formatAddress } from '@/lib/utils';
import WalletConnectButton from '@/components/WalletConnectButton';


// Format large XP numbers: 22,005,639 -> "22.0M"
const formatXP = (num: number): string => {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1) + 'M';
    }
    return num.toLocaleString();
};

// Skeleton Component for Instant Perceived Loading
function MissionControlSkeleton() {
    return (
        <DashboardLayout>
            <div className="space-y-16 animate-pulse">
                {/* Header Skeleton */}
                <div className="border border-white/5 bg-zinc-950/40 p-8 h-[400px] relative">
                    <div className="flex flex-col lg:flex-row justify-between gap-12">
                        <div className="flex-1 space-y-8">
                            <div className="h-4 w-32 bg-zinc-800 rounded" />
                            <div className="h-24 w-3/4 bg-zinc-800 rounded" />
                            <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                            <div className="flex gap-4 pt-4">
                                <div className="h-8 w-24 bg-zinc-800 rounded" />
                                <div className="h-8 w-24 bg-zinc-800 rounded" />
                            </div>
                        </div>
                        <div className="w-full lg:w-[420px] space-y-4">
                            <div className="h-[200px] bg-zinc-900 rounded" />
                            <div className="h-[100px] bg-zinc-900 rounded" />
                        </div>
                    </div>
                </div>

                {/* Streak Skeleton */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-zinc-900 rounded" />
                    <div className="h-32 bg-zinc-900 rounded" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[300px] bg-zinc-900 rounded border border-white/5" />
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}

interface MissionData {
    missions: any[];
    streaks: {
        faucet_streak: number;
        stake_streak: number;
        last_faucet_date: string | null;
        last_stake_date: string | null;
    };
    referralInfo?: any;
    points?: number;
    userProfile?: {
        twitter_id?: string;
        twitter_username?: string;
        legacy_claimed?: boolean;
        telegram_id?: string;
        discord_id?: string;
    };
    streakBonusEarned?: boolean;
    streakBonusModalPending?: boolean;
    config?: {
        streak_reward_day_7: number;
        streak_cycle_days: number;
    };
}

function MissionControlContent() {
    const { address, isConnecting, isReconnecting } = useAccount();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<MissionData | null>(null);
    const [loading, setLoading] = useState(true);

    // Redis Status - Hardcoded (no polling needed)
    const redisStatus = { connected: true, latency: 90 };

    // Hydration Guard: Prevents flash of "Restricted Access" during SSR/hydration
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Modal State
    const [legacyPoints, setLegacyPoints] = useState(0);
    const [showLegacyModal, setShowLegacyModal] = useState(false);

    // Streak Modal
    const [showStreakModal, setShowStreakModal] = useState(false);
    // Telegram Modal
    const [showTelegramModal, setShowTelegramModal] = useState(false);

    // User Rank State
    const [userRank, setUserRank] = useState<any>(null);

    // Handle OAuth Callbacks
    useEffect(() => {
        if (!searchParams) return;

        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const points = searchParams.get('points_claimed');

        if (success === 'twitter_linked') {
            if (points && parseInt(points as string) > 0) {
                setLegacyPoints(parseInt(points as string));
                setShowLegacyModal(true);
            } else {
                toast.success("Identity Verified: X Account Linked");
            }
            // Clean URL
            router.replace('/mission-control');
        }

        if (success === 'discord_linked') {
            toast.success("Identity Verified: Discord Account Linked");
            router.replace('/mission-control');
        }

        if (error) {
            const msgs: Record<string, string> = {
                'twitter_already_linked': 'This X account is already linked to another wallet.',
                'discord_already_linked': 'This Discord account is already linked to another wallet.',
                'session_expired': 'Session expired. Please try connecting again.',
                'server_error': 'Server verification failed. Try again later.',
                'discord_not_member': 'Access Denied: You must join our Discord server first.'
            };

            if (error === 'discord_not_member') {
                toast.error(
                    <div className="flex flex-col gap-2">
                        <span>{msgs[error]}</span>
                        <a
                            href="https://discord.com/invite/dV2sQtnQEu"
                            target="_blank"
                            className="bg-[#e2ff3d] text-black px-3 py-1 text-[10px] font-black uppercase text-center hover:bg-white transition-colors"
                        >
                            [ JOIN DISCORD SERVER ]
                        </a>
                    </div>,
                    { duration: 6000 }
                );
            } else {
                toast.error(msgs[error as string] || 'Verification Failed');
            }
            router.replace('/mission-control');
        }
    }, [searchParams, router]);

    // Auto-Trigger for Discord Verification (from external link)
    // Auto-Trigger for Discord Verification (from external link)
    useEffect(() => {
        const trigger = searchParams?.get('trigger');
        if (address && trigger === 'discord_verify' && data) {
            // Check dependency: Telegram (-101)
            const telegramMission = data.missions.find((m: any) => m.id === -101);

            if (!telegramMission?.is_completed) {
                toast.error("SECURITY PROTOCOL: Telegram verification required first.");
                router.replace('/mission-control'); // Clear param
                return;
            }

            // Redirect immediately to start auth flow
            window.location.href = `/api/auth/discord/login?address=${address}&trigger=auto_back`;
        }
    }, [address, searchParams, data, router]);

    const fetchData = async () => {
        if (!address) return;
        // Only show full page loading on initial fetch
        if (!data) setLoading(true);

        try {
            // BFF Pattern: Single request for Missions, Streaks, Points, AND Referrals
            const res = await fetch(`/api/missions?address=${address}&_t=${Date.now()}`);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                console.error('API Error:', res.status, errorBody);
                throw new Error(errorBody.details || errorBody.error || 'Failed to fetch data');
            }
            const json = await res.json();
            setData(json);




            if (json.streakBonusModalPending) {
                setShowStreakModal(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        if (address) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [address]);

    // Fetch User Rank
    useEffect(() => {
        if (address) {
            fetch(`/api/incentive/profile?address=${address}`)
                .then(r => r.json())
                .then(data => setUserRank(data))
                .catch(console.error);
        } else {
            setUserRank(null);
        }
    }, [address, data]); // specific dependency on data to refresh rank when points change

    // Hydration Guard + Wallet Init: Show blank screen until client is ready
    if (!mounted || isConnecting || isReconnecting) {
        return (
            <DashboardLayout>
                <div className="min-h-[70vh]" />
            </DashboardLayout>
        );
    }

    if (!address) {
        return (
            <DashboardLayout>
                <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden -mt-12 lg:mt-0">
                    {/* Background Decor: Protocol Grid */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                    {/* Blurred Content Preview (simulated) */}
                    <div className="absolute inset-x-0 top-0 bottom-0 opacity-5 blur-2xl pointer-events-none select-none hidden lg:block">
                        <div className="max-w-7xl mx-auto px-6 space-y-16 py-12">
                            <div className="h-64 bg-white/20 rounded-none w-full" />
                            <div className="grid grid-cols-3 gap-6">
                                <div className="h-48 bg-white/20" />
                                <div className="h-48 bg-white/20" />
                                <div className="h-48 bg-white/20" />
                            </div>
                        </div>
                    </div>

                    {/* Central Protocol Lock */}
                    <div className="relative z-10 w-full max-w-md p-8 lg:p-12 bg-zinc-950 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] mx-4">
                        <div className="absolute -top-px -left-px w-8 h-8 border-t border-l border-[#e2ff3d]/50" />
                        <div className="absolute -bottom-px -right-px w-8 h-8 border-b border-r border-zinc-800" />

                        <div className="space-y-8 text-center">


                            <div className="space-y-3">
                                <h1 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                                    RESTRICTED<br />
                                    <span className="text-[#e2ff3d] outline-text-glow">ACCESS.</span>
                                </h1>
                                <p className="text-[#e2ff3d]/40 font-mono text-[9px] uppercase tracking-[0.4em] font-bold">
                                    ACTIVE // AUTH_REQUIRED
                                </p>
                            </div>

                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            <p className="text-zinc-500 text-xs font-mono leading-relaxed px-4">
                                Mission Control requires a secure cryptographic link. Connect your authorized wallet to access network statistics and distribution tasks.
                            </p>

                            <div className="pt-4">
                                <WalletConnectButton fullWidth />
                            </div>

                            <div className="flex justify-center gap-6 opacity-30 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                                <span className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-800" /> SECURE_DATA</span>
                                <span className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-800" /> AWAIT_SYNC</span>
                            </div>
                        </div>
                    </div>

                    <style jsx>{`
                        .outline-text-glow {
                            -webkit-text-stroke: 1px rgba(226, 255, 61, 0.2);
                            text-stroke: 1px rgba(226, 255, 61, 0.2);
                        }
                    `}</style>
                </div>
            </DashboardLayout>
        );
    }

    if (loading || !data) {
        return <MissionControlSkeleton />;
    }

    const { referralInfo, points: totalPoints, userProfile } = data;
    const missions = data?.missions || [];
    // Hide ALL completed missions
    const activeMissions = missions.filter((m: any) => !m.is_completed || m.next_available_at);

    return (
        <DashboardLayout>
            {/* User Rank Display - Responsive Variants */}
            <AnimatePresence>
                {address && userRank && (
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
                                        <span className="text-[#e2ff3d] uppercase font-bold tracking-widest">Estimated_$USDZ</span>
                                        <span className="text-[#e2ff3d] font-black">${(parseInt(userRank.points || 0) * 0.0025).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-gray-600 uppercase font-bold tracking-widest">Verification_ID</span>
                                        <span className="text-white/40">{formatAddress(address || '')}</span>
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
                                    <div className="w-10 h-10  flex items-center justify-center">
                                        <span className="text-[#e2ff3d] font-black text-lg">#{userRank.rank}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-[#e2ff3d] font-bold uppercase tracking-widest">Global Rank</span>
                                        <span className="text-[9px] text-gray-500 font-mono tracking-wider">{formatAddress(address || '')}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-[#e2ff3d] tracking-tighter leading-none">
                                        ${(parseInt(userRank.points || 0) * 0.0025).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <span className="text-[8px] text-[#e2ff3d] font-bold uppercase tracking-[0.2em] block mt-0.5">$USDZ Amount</span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="space-y-8 lg:space-y-16">

                {/* Institutional Command Console */}
                <div className="relative border border-white/5 bg-zinc-950/40 backdrop-blur-xl p-4 lg:p-12 overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#e2ff3d]/50" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#e2ff3d]/50" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-zinc-800" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-800" />

                    <div className="flex flex-col lg:flex-row justify-between gap-10 lg:gap-12 relative z-10">

                        {/* Column 01: Protocol Identity */}
                        <div className="flex-1 space-y-6 lg:space-y-10">
                            <div className="space-y-4 lg:space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className={`h-0.5 w-12 ${userProfile?.twitter_id ? 'bg-[#e2ff3d]' : 'bg-red-500/50'}`} />
                                    <span className={`text-[10px] font-mono font-black uppercase tracking-[0.5em] ${userProfile?.twitter_id ? 'text-[#e2ff3d]' : 'text-red-500/50'}`}>
                                        {userProfile?.twitter_id ? `Identity // Verified: @${userProfile.twitter_username}` : 'Identity // Unverified'}
                                    </span>
                                </div>

                                <h1 className="text-4xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.85]">
                                    MISSION<br />
                                    <span className="text-zinc-600 outline-text">CONTROL.</span>
                                </h1>
                            </div>

                            <div className="hidden lg:flex flex-wrap gap-4 pt-4">
                                <div className="bg-zinc-900/50 border border-white/5 py-3 px-6 text-[#e2ff3d] min-w-[200px]">
                                    <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block mb-1">Active Invites</span>
                                    <span className="text-xl font-black tabular-nums tracking-tight">{referralInfo?.stats?.total_referrals || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Column 02: Performance Stack (Vertical) */}
                        <div className="w-full lg:w-[420px] space-y-4">

                            {/* XP Yield Module */}
                            <div className="relative group/card bg-zinc-950 border border-white/10 p-6 lg:p-8 shadow-xl">
                                <div className="space-y-6 relative">
                                    {/* Header: Tier Progression */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[#e2ff3d]">{referralInfo?.tier?.current_tier || 'UNRANKED'}</span>
                                                <div className="h-px w-8 bg-zinc-800" />
                                                <span className="text-zinc-600">{referralInfo?.tier?.next_tier || 'MAX'}</span>
                                            </div>
                                            {/* Multiplier Badge (Moved Here) */}
                                            <div className="px-2 py-0.5 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 text-[#e2ff3d] text-[9px]">
                                                {referralInfo?.tier?.current_multiplier || '1.0'}X BOOST
                                            </div>
                                        </div>

                                        {/* Requirements */}
                                        {referralInfo?.tier?.next_tier !== 'MAX_LEVEL' && (
                                            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider pl-1 border-l-2 border-zinc-800">
                                                REQ: {referralInfo?.tier?.missing_requirements?.replace('More ', '').toUpperCase() || 'SYNCING...'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Main XP Display */}
                                    <div className="flex items-baseline gap-3 py-2">
                                        <div className={`${(totalPoints || 0) >= 1_000_000 ? 'text-6xl lg:text-7xl' : 'text-7xl lg:text-8xl'} font-black text-white tabular-nums tracking-tighter leading-none transition-all duration-300`}>
                                            {formatXP(totalPoints || 0)}
                                        </div>
                                        <div className="text-lg text-[#e2ff3d] font-black uppercase tracking-widest rotate-[-90deg] origin-bottom-left translate-x-6 -translate-y-2 opacity-50">XP</div>
                                    </div>

                                    {/* Progress Bar & Footer */}
                                    <div className="space-y-3 pt-2">
                                        <div className="h-1.5 w-full bg-zinc-900 rounded-none overflow-hidden border border-white/5">
                                            {referralInfo?.tier?.progress ? (
                                                <div
                                                    className="h-full bg-[#e2ff3d] shadow-[0_0_10px_rgba(226,255,61,0.5)]"
                                                    style={{
                                                        width: `${referralInfo.tier.progress_percent || 0}%`
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-full bg-[#111] w-full" />
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                                            <span className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-[#e2ff3d] animate-pulse" />
                                                YIELD_RATE: <span className="text-white">{referralInfo?.tier?.current_multiplier || '1.0'}x</span>
                                            </span>
                                            <span className="text-zinc-600">
                                                {referralInfo?.tier?.next_tier !== 'MAX_LEVEL'
                                                    ? `PROGRESS: ${Math.floor(referralInfo?.tier?.progress_percent || 0)}%`
                                                    : 'MAX_CLEARANCE'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Referral Portal Module */}
                            <div className="bg-zinc-900/40 border border-white/5 p-6 space-y-4 backdrop-blur-md">
                                <div className="flex items-center gap-0 group/link border border-white/10 hover:border-[#e2ff3d]/30 transition-all bg-black/40 p-1">
                                    <div className="flex-1 font-mono text-[10px] text-zinc-400 px-4 truncate select-all py-3 tracking-wide">
                                        {referralInfo?.code && referralInfo.code !== 'LOADING'
                                            ? `https://testnet.zugchain.org/?ref=${referralInfo.code}`
                                            : 'awaiting_deployment...'
                                        }
                                    </div>
                                    <button
                                        onClick={() => {
                                            const url = `https://testnet.zugchain.org/?ref=${referralInfo.code}`;
                                            navigator.clipboard.writeText(url);
                                            toast.success('Uplink copied to clipboard');
                                        }}
                                        className="bg-[#e2ff3d] hover:bg-white text-black text-[10px] font-black uppercase px-6 py-3 transition-colors shrink-0 flex items-center gap-2"
                                    >
                                        [ COPY ]
                                    </button>
                                </div>

                                {/* Mobile Stats Column (Only visible on mobile) */}
                                <div className="flex lg:hidden gap-3 px-1">
                                    <div className="flex-1 bg-zinc-950/50 border border-white/5 py-3 px-4 text-center">
                                        <div className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest mb-1">Invites</div>
                                        <div className="text-xs font-black text-[#e2ff3d] font-mono">{referralInfo?.stats?.total_referrals || 0}</div>
                                    </div>
                                </div>

                                <div className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest flex justify-between px-1">
                                    <span>// SECURE_SHARE_AUTH</span>
                                    <span className="text-zinc-600">VALID_NODE</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 opacity-30   mt-8">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${redisStatus?.connected ? 'bg-[#e2ff3d] animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-[9px] font-mono text-white uppercase tracking-widest">
                                Network: {redisStatus?.connected ? 'STABLE' : 'UNSTABLE'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-zinc-600" />
                            <span className="text-[9px] font-mono text-white uppercase tracking-widest">
                                Latency: {redisStatus?.latency || 0}ms
                            </span>
                        </div>
                    </div>
                </div>

                <style jsx>{`
                    .outline-text {
                        -webkit-text-stroke: 1.5px rgba(255,255,255,0.15);
                        text-stroke: 1.5px rgba(255,255,255,0.15);
                    }
                `}</style>

                {/* 1. STREAK */}
                <section className="mt-4 lg:mt-0 border-t border-white/5 pt-4">
                    <StreakTracker
                        faucetStreak={data?.streaks?.faucet_streak || 0}
                        stakeStreak={data?.streaks?.stake_streak || 0}
                        lastFaucetDate={data?.streaks?.last_faucet_date || null}
                        lastStakeDate={data?.streaks?.last_stake_date || null}
                    />
                </section>

                {/* 2. MISSIONS */}
                <section>
                    <div className="flex items-baseline justify-between mb-6 lg:mb-8">
                        <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">
                            Active Assignments
                        </h2>
                        <span className="font-mono text-[10px] lg:text-xs text-gray-500">
                            {activeMissions.length} TASKS PENDING
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeMissions.map((mission: any) => {
                            // Dependency Logic: 
                            let locked = false;
                            let lockedMessage = undefined;

                            // 1. Join Telegram Group (-101) is the base social requirement

                            // 2. Join Discord Server (-103) requires USER to be verified in database for Telegram (-101)
                            // or have the telegram_id in userProfile
                            if (mission.id === -103) {
                                // Real-time check from userProfile which we get from API
                                if (!userProfile?.telegram_id) {
                                    locked = true;
                                    lockedMessage = '// TELEGRAM REQUIRED';
                                }
                            }

                            // 3. Grab Discord Role (-102) requires Telegram AND Join Discord Server (-103)
                            if (mission.id === -102) {
                                const isJoinDone = !missions.some((m: any) => m.id === -103 && !m.is_completed);
                                if (!userProfile?.telegram_id) {
                                    locked = true;
                                    lockedMessage = '// TELEGRAM REQUIRED';
                                } else if (isJoinDone === false) {
                                    locked = true;
                                    lockedMessage = '// JOIN SERVER FIRST';
                                }
                            }

                            // Dynamic Requirements (Admin Configured)
                            if (mission.requires_telegram && !userProfile?.telegram_id) {
                                locked = true;
                                lockedMessage = '// TELEGRAM REQUIRED';
                            }

                            if (mission.requires_discord && !userProfile?.discord_id) {
                                locked = true;
                                lockedMessage = '// DISCORD REQUIRED';
                            }

                            return (
                                <MissionCard
                                    key={mission.id}
                                    {...mission}
                                    reward={mission.reward_points}
                                    isCompleted={mission.is_completed}
                                    verificationLink={mission.verification_data}
                                    timeLeft={mission.time_left}
                                    requiresVerification={mission.requires_verification}
                                    isUserVerified={!!userProfile?.twitter_id}
                                    isDiscordLinked={!!userProfile?.discord_id}
                                    multiplier={referralInfo?.tier?.current_multiplier || 1.0}
                                    onComplete={() => fetchData()}
                                    onTelegramVerify={() => setShowTelegramModal(true)}
                                    locked={locked}
                                    lockedMessage={lockedMessage}
                                    referralCode={referralInfo?.code}
                                    type={mission.type}
                                />
                            );
                        })}
                        {activeMissions.length === 0 && (
                            <div className="col-span-full py-16 flex items-center justify-center border border-white/5 bg-[#0b0b0b] text-gray-600 font-mono text-xs">
                                // ALL ASSIGNMENTS COMPLETED //
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. INVITE MILESTONE REWARDS */}
                <section className="border-t border-white/5 pt-8 lg:pt-12">
                    <div className="flex flex-col lg:flex-row items-start lg:items-baseline justify-between mb-6 lg:mb-8 gap-3">
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">
                                Invite Milestone Rewards
                            </h2>
                            <p className="text-[10px] font-mono text-zinc-600 mt-1 tracking-wide">
                                Earn bonus XP for hitting verified invite milestones
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {/* Total Invites */}
                            <div className="bg-zinc-900/50 border border-white/10 px-4 py-2 min-w-[120px]">
                                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest block">Total Invites</span>
                                <span className="text-2xl font-black text-zinc-400 font-mono">{referralInfo?.stats?.total_referrals || 0}</span>
                            </div>
                            {/* Verified Invites */}
                            <div className="bg-[#e2ff3d]/5 border border-[#e2ff3d]/20 px-4 py-2 min-w-[120px]">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Verified Invites</span>
                                <span className="text-2xl font-black text-[#e2ff3d] font-mono">{referralInfo?.stats?.verified_referrals || 0}</span>
                            </div>
                        </div>
                    </div>

                    <InviteMilestones address={address || ''} />
                </section>

                <TelegramVerifyModal
                    open={showTelegramModal}
                    onClose={() => setShowTelegramModal(false)}
                    walletAddress={address}
                    onVerified={() => {
                        setShowTelegramModal(false);
                        fetchData();
                    }}
                />

                <LegacyClaimModal
                    isOpen={showLegacyModal}
                    points={legacyPoints}
                    onClose={() => setShowLegacyModal(false)}
                />

                <StreakSuccessModal
                    open={showStreakModal}
                    points={data?.config?.streak_reward_day_7 || 1000}
                    onClose={async () => {
                        setShowStreakModal(false);
                        try {
                            if (address) {
                                await fetch('/api/missions/ack', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ address })
                                });
                                // Refetch to update UI (Points, Modal Status)
                                await fetchData();
                            }
                        } catch (e) {
                            console.error('Failed to ack streak modal', e);
                        }
                    }}
                />




            </div>
        </DashboardLayout>
    );
}

export default function MissionControlPage() {
    return (
        <Suspense fallback={<MissionControlSkeleton />}>
            <MissionControlContent />
        </Suspense>
    );
}

