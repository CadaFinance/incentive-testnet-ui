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
import { InstitutionalTasks } from '@/components/MissionControl/InstitutionalTasks';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChartNoAxesColumn, User, Origami, Swords, Fingerprint, Crown, Gem, Copy, Zap } from 'lucide-react';
import { formatAddress } from '@/lib/utils';
import WalletConnectButton from '@/components/WalletConnectButton';
import { INSTITUTIONAL_BADGES, getUSDZMultiplier } from '@/lib/badges';


// Format large XP numbers: 22,005,639 -> "22.0M"
const formatXP = (num: number): string => {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1) + 'M';
    }
    return num.toLocaleString();
};

const formatMobileAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-2)}`;
};

// Get tier icon component based on tier name
const getTierIcon = (tier: string, size: number = 14, className: string = '') => {
    const tierLower = tier?.toLowerCase() || '';
    if (tierLower.includes('scout')) return <Origami size={size} className={className} />;
    if (tierLower.includes('vanguard')) return <Swords size={size} className={className} />;
    if (tierLower.includes('elite')) return <Fingerprint size={size} className={className} />;
    if (tierLower.includes('legend')) return <Crown size={size} className={className} />;
    if (tierLower.includes('mythic')) return <Gem size={size} className={className} />;
    return <Zap size={size} className={className} />;
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

    // Dynamic Reward Toggle (Loop)
    const [showPotential, setShowPotential] = useState(true);
    useEffect(() => {
        const interval = setInterval(() => {
            setShowPotential(prev => !prev);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

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
                    <div className="relative z-10 w-full max-w-sm overflow-hidden bg-[#12141f] inst-border rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] mx-4">
                        {/* Background Atmosphere */}
                        <div className="absolute inset-0 blueprint-grid-fine opacity-20 pointer-events-none" />
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d]/20 to-transparent" />

                        <div className="p-10 text-center relative z-10">
                            <div className="flex justify-center mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5">
                                    <Fingerprint className="text-[#e2ff3d] w-2.5 h-2.5" />
                                    <span className="text-[8px] font-mono font-bold tracking-[0.3em] text-[#e2ff3d] uppercase">ACCESS_DENIED_v2.0</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                                    RESTRICTED<br />
                                    <span className="text-[#e2ff3d]">ACCESS</span>
                                </h1>
                                <p className="text-gray-500 font-mono text-[9px] tracking-[0.05em] leading-relaxed uppercase max-w-[260px] mx-auto">
                                    Mission Control requires a secure cryptographic link. Connect your authorized wallet to access network statistics.
                                </p>
                            </div>

                            <div className="pt-2">
                                <WalletConnectButton fullWidth />
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-2">
                                <div className="text-[7px] font-mono text-white/5 uppercase tracking-[0.4em]">ENCRYPTED_TLS_v1.3</div>
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
    // Filter and Sort Missions: Unlocked first, then Locked
    const activeMissions = missions
        .filter((m: any) => !m.is_completed || m.next_available_at)
        .sort((a, b) => {
            const isLocked = (m: any) => {
                return (m.id === -103 && !userProfile?.telegram_id) ||
                    (m.id === -102 && (!userProfile?.telegram_id || missions.some((subM: any) => subM.id === -103 && !subM.is_completed))) ||
                    (m.requires_telegram && !userProfile?.telegram_id) ||
                    (m.requires_discord && !userProfile?.discord_id) ||
                    (m.requires_verification && !userProfile?.twitter_id);
            };

            const aLocked = isLocked(a);
            const bLocked = isLocked(b);

            if (aLocked && !bLocked) return 1;
            if (!aLocked && bLocked) return -1;
            return 0;
        });

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
                            className="hidden sm:block fixed bottom-10 right-10 z-[100] w-[300px]"
                        >
                            {/* Animated Border Container */}
                            <div className="relative p-[1px] overflow-hidden rounded-3xl">
                                <div className="absolute -inset-[200%] animate-border-spin bg-neon-conic" />
                                <div className="relative bg-[#030303]/90 backdrop-blur-xl p-6 z-10 rounded-3xl">
                                    <div className="space-y-4">
                                        {/* Header */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[8px] text-white/40 font-black uppercase tracking-[0.2em]">Your_Rank</span>
                                                <h4 className="text-4xl font-black text-white tracking-tighter tabular-nums">#{userRank.rank || '...'}</h4>
                                            </div>
                                            <div className="w-14 h-14 bg-white/[0.03] rounded-2xl border border-white/10 flex items-center justify-center">
                                                <ChartNoAxesColumn className="w-7 h-7 text-[#e2ff3d]" />
                                            </div>
                                        </div>

                                        {/* Badges Row */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {userRank.rank === 1 && <span className="text-[8px] bg-[#e2ff3d] text-black px-2 py-1 font-black uppercase">SUPREME</span>}
                                            {userRank.rank === 2 && <span className="text-[8px] bg-white text-black px-2 py-1 font-black uppercase">MASTER</span>}
                                            {userRank.rank === 3 && <span className="text-[8px] bg-[#e2ff3d]/10 text-[#e2ff3d] px-2 py-1 font-black uppercase border border-[#e2ff3d]/20">ELITE</span>}
                                            {userRank.badges?.length > 0 ? (
                                                userRank.badges.map((badgeId: string) => {
                                                    const badge = INSTITUTIONAL_BADGES[badgeId as keyof typeof INSTITUTIONAL_BADGES];
                                                    if (!badge) return null;
                                                    return (
                                                        <span key={badgeId} className={`text-[8px] bg-white/5 ${badge.color} px-2 py-1 font-black uppercase border border-white/10 flex items-center gap-1`}>
                                                            {badge.icon} {badge.name}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <div className="w-full mt-2 p-3 bg-white/[0.03] rounded-xl space-y-2 animate-pulse">
                                                    <p className="text-[10px] text-white/40 font-mono leading-tight">
                                                        Obtain <span className="text-white font-bold">TITAN</span> badge to unlock <span className="text-[#e2ff3d] font-bold">4X $USDZ</span> reward multiplier.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stats */}
                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <div className="relative h-[44px]">
                                                <AnimatePresence mode="wait">
                                                    {!showPotential || userRank.badges?.includes('INSTITUTIONAL_STAKER') ? (
                                                        <motion.div
                                                            key="actual"
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="flex items-center justify-between text-[10px] font-mono h-full"
                                                        >
                                                            <span className="text-white/40 uppercase font-bold tracking-widest leading-none">Actual Reward</span>
                                                            <span className="text-white font-black whitespace-nowrap text-sm">${(parseInt(userRank.points || 0) * getUSDZMultiplier(userRank.badges)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="potential"
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="flex items-center justify-between text-[10px] font-mono p-2  h-full"
                                                        >
                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                <span className="bg-[#e2ff3d] text-black px-1 text-[8px] rounded-sm font-black animate-pulse">4X</span>
                                                                <span className="text-white px-1 text-[8px]  font-white"> with</span>

                                                                <span className="text-[#e2ff3d] uppercase font-black tracking-widest flex items-center gap-1 px-1.5 py-0.5 border border-[#e2ff3d]/20 bg-[#e2ff3d]/5">
                                                                    {INSTITUTIONAL_BADGES.INSTITUTIONAL_STAKER.icon} TITAN
                                                                </span>
                                                            </div>
                                                            <span className="text-[#e2ff3d] font-black text-sm">${(parseInt(userRank.points || 0) * 0.01).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] font-mono">
                                                <span className="text-white/40 uppercase font-bold tracking-widest">Wallet_ID</span>
                                                <span className="text-white/40">{formatAddress(address || '')}</span>
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

                            <div className="relative z-10 bg-[#030303]/90 backdrop-blur-xl p-4 rounded-xl">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-start gap-2">
                                            <span className="text-4xl font-black text-[#e2ff3d] tracking-tighter leading-none">#{userRank.rank}</span>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] text-[#e2ff3d] font-bold uppercase tracking-widest leading-none mt-1">Your Rank</span>
                                                <span className="text-[10px] text-white/40 font-mono leading-none mt-2 opacity-50">{formatMobileAddress(address || '')}</span>
                                            </div>
                                        </div>
                                        {/* User Badges - Icon only on mobile card */}
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {userRank.rank === 1 && <span className="w-5 h-5 bg-[#e2ff3d] rounded-full flex items-center justify-center text-[7px] font-black text-black">S</span>}
                                            {userRank.rank === 2 && <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[7px] font-black text-black">M</span>}
                                            {userRank.rank === 3 && <span className="w-5 h-5 bg-[#e2ff3d]/10 border border-[#e2ff3d]/30 rounded-full flex items-center justify-center text-[7px] font-black text-[#e2ff3d]">E</span>}
                                            {userRank.badges?.length > 0 ? (
                                                userRank.badges.map((badgeId: string) => {
                                                    const badge = INSTITUTIONAL_BADGES[badgeId as keyof typeof INSTITUTIONAL_BADGES];
                                                    return badge ? <span key={badgeId} className={`w-5 h-5 bg-white/5 border border-white/10 rounded-full flex items-center justify-center ${badge.color} text-[10px]`}>{badge.icon}</span> : null;
                                                })
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end justify-center">
                                        <div className="relative h-[48px] flex flex-col items-end justify-center min-w-[100px]">
                                            <AnimatePresence mode="wait">
                                                {!showPotential || userRank.badges?.includes('INSTITUTIONAL_STAKER') ? (
                                                    <motion.div
                                                        key="actual-mobile"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="flex flex-col items-end"
                                                    >
                                                        <div className="text-2xl font-black text-white tracking-tighter">
                                                            ${(parseInt(userRank.points || 0) * getUSDZMultiplier(userRank.badges)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                        <span className="text-[8px] text-[#e2ff3d]/60 font-bold uppercase tracking-widest mt-1">EST. $USDZ</span>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="potential-mobile"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="flex flex-col items-end gap-1"
                                                    >
                                                        <div className="flex items-center gap-1.5 leading-none">
                                                            <span className="text-2xl font-black text-[#e2ff3d] tracking-tighter">
                                                                ${(parseInt(userRank.points || 0) * 0.01).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="bg-[#e2ff3d] text-black px-1 text-[8px] rounded-sm font-black animate-pulse">4X</span>
                                                            <span className="text-[8px]">with</span>
                                                            <span className="text-[7px] text-[#e2ff3d] font-bold uppercase tracking-widest leading-none flex items-center gap-1 px-1.5 py-0.5 border border-[#e2ff3d]/20 bg-[#e2ff3d]/5">
                                                                {INSTITUTIONAL_BADGES.INSTITUTIONAL_STAKER.icon} TITAN
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="space-y-4 -mt-8 lg:mt-0re lg:space-y-16">

                {/* ========== MOBILE LAYOUT ========== */}
                <div className="lg:hidden space-y-3 -mt-8">
                    {/* Title */}
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                        MISSION<span className="text-zinc-600">CONTROL.</span>
                    </h1>

                    {/* Stats Card */}
                    <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        {/* Tier Row: Current -> Next */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {getTierIcon(referralInfo?.tier?.current_tier || 'SCOUT', 14, 'text-[#e2ff3d]')}
                                <span className="text-[11px] font-black text-[#e2ff3d] uppercase">{referralInfo?.tier?.current_tier || 'SCOUT'}</span>
                                <span className="text-white/20 text-xs">—</span>
                                {getTierIcon(referralInfo?.tier?.next_tier || 'VANGUARD', 12, 'text-white/20')}
                                <span className="text-[11px] font-black text-white/20 uppercase">{referralInfo?.tier?.next_tier || 'VANGUARD'}</span>
                            </div>
                            <div className="text-xl font-black text-white tabular-nums tracking-tight">
                                {formatXP(totalPoints || 0)} <span className="text-[10px] text-[#e2ff3d] font-mono">XP</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="h-1.5 w-full bg-white/5 overflow-hidden rounded-full border border-white/5">
                                <div
                                    className="h-full bg-[#e2ff3d] shadow-[0_0_10px_rgba(226,255,61,0.5)]"
                                    style={{ width: `${referralInfo?.tier?.progress_percent || 0}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-white/40">
                                <span className="truncate max-w-[60%]">
                                    {referralInfo?.tier?.next_tier !== 'MAX_LEVEL'
                                        ? `REQ: ${referralInfo?.tier?.missing_requirements?.replace('More ', '').toUpperCase() || '...'}`
                                        : 'MAX LEVEL'
                                    }
                                </span>
                                <span className="text-white/60">{Math.floor(referralInfo?.tier?.progress_percent || 0)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Referral Card */}
                    <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-3 rounded-lg">
                                <span className="font-mono text-[9px] text-white/40 truncate block">
                                    {referralInfo?.code && referralInfo.code !== 'LOADING'
                                        ? `testnet.zugchain.org/?ref=${referralInfo.code}`
                                        : 'Loading...'
                                    }
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    const url = `https://testnet.zugchain.org/?ref=${referralInfo?.code}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success('Link copied!');
                                }}
                                className="bg-[#e2ff3d] text-black p-3 shrink-0 rounded-lg hover:bg-white transition-colors"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between mt-3 px-1">
                            <span className="text-[9px] font-mono text-white/40">Invites: <span className="text-white">{referralInfo?.stats?.total_referrals || 0}</span></span>
                            <span className="text-[9px] font-mono text-[#e2ff3d] bg-[#e2ff3d]/10 px-2 py-0.5 rounded border border-[#e2ff3d]/20">{referralInfo?.tier?.current_multiplier || '1.0'}x Boost Active</span>
                        </div>
                    </div>
                </div>

                {/* ========== DESKTOP LAYOUT ========== */}
                <div className="hidden lg:block relative border border-white/10 bg-white/[0.02] backdrop-blur-xl p-12 overflow-hidden shadow-2xl rounded-[40px]">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#e2ff3d]/50" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#e2ff3d]/50" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-zinc-800" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-800" />

                    <div className="flex flex-row justify-between gap-12 relative z-10">

                        {/* Column 01: Protocol Identity */}
                        <div className="flex-1 space-y-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className={`h-0.5 w-12 ${userProfile?.twitter_id ? 'bg-[#e2ff3d]' : 'bg-red-500/50'}`} />
                                    <span className={`text-[10px] font-mono font-black uppercase tracking-[0.5em] ${userProfile?.twitter_id ? 'text-[#e2ff3d]' : 'text-red-500/50'}`}>
                                        {userProfile?.twitter_id ? `Identity // Verified: @${userProfile.twitter_username}` : 'Identity // Unverified'}
                                    </span>
                                </div>

                                <h1 className="text-8xl font-black text-white uppercase tracking-tighter leading-[0.85]">
                                    MISSION<br />
                                    <span className="text-zinc-600 outline-text">CONTROL.</span>
                                </h1>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <div className="bg-white/[0.02] border border-white/10 py-3 px-6 text-[#e2ff3d] min-w-[200px] rounded-2xl">
                                    <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-widest block mb-1">Active Invites</span>
                                    <span className="text-xl font-black tabular-nums tracking-tight">{referralInfo?.stats?.total_referrals || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Column 02: Performance Stack */}
                        <div className="w-[420px] space-y-4">

                            {/* XP Yield Module */}
                            <div className="relative group/card bg-white/[0.02] backdrop-blur-md border border-white/10 p-8 shadow-2xl rounded-[32px]">
                                <div className="space-y-6 relative">
                                    {/* Header: Tier Progression with Icons */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                                {getTierIcon(referralInfo?.tier?.current_tier || 'SCOUT', 14, 'text-[#e2ff3d]')}
                                                <span className="text-[#e2ff3d]">{referralInfo?.tier?.current_tier || 'UNRANKED'}</span>
                                                <div className="h-px w-8 bg-white/10" />
                                                {getTierIcon(referralInfo?.tier?.next_tier || 'VANGUARD', 12, 'text-white/20')}
                                                <span className="text-white/20">{referralInfo?.tier?.next_tier || 'MAX'}</span>
                                            </div>
                                            <div className="px-2 py-0.5 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 text-[#e2ff3d] text-[9px]">
                                                {referralInfo?.tier?.current_multiplier || '1.0'}X BOOST
                                            </div>
                                        </div>

                                        {referralInfo?.tier?.next_tier !== 'MAX_LEVEL' && (
                                            <div className="text-[8px] font-mono text-white/30 uppercase tracking-wider pl-1 border-l-2 border-white/10">
                                                REQ: {referralInfo?.tier?.missing_requirements?.replace('More ', '').toUpperCase() || 'SYNCING...'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Main XP Display */}
                                    <div className="flex items-baseline gap-3 py-2">
                                        <div className={`${(totalPoints || 0) >= 1_000_000 ? 'text-7xl' : 'text-8xl'} font-black text-white tabular-nums tracking-tighter leading-none transition-all duration-300`}>
                                            {formatXP(totalPoints || 0)}
                                        </div>
                                        <div className="text-lg text-[#e2ff3d] font-black uppercase tracking-widest rotate-[-90deg] origin-bottom-left translate-x-6 -translate-y-2 opacity-50">XP</div>
                                    </div>

                                    {/* Progress Bar & Footer */}
                                    <div className="space-y-3 pt-2">
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            {referralInfo?.tier?.progress ? (
                                                <div
                                                    className="h-full bg-[#e2ff3d] shadow-[0_0_10px_rgba(226,255,61,0.5)]"
                                                    style={{ width: `${referralInfo.tier.progress_percent || 0}%` }}
                                                />
                                            ) : (
                                                <div className="h-full bg-[#111] w-full" />
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-mono text-white/40 uppercase tracking-widest">
                                            <span className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-[#e2ff3d] animate-pulse" />
                                                YIELD_RATE: <span className="text-white">{referralInfo?.tier?.current_multiplier || '1.0'}x</span>
                                            </span>
                                            <span className="text-white/40">
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
                            <div className="bg-white/[0.02] border border-white/10 p-6 space-y-4 backdrop-blur-md rounded-[24px]">
                                <div className="flex items-center gap-0 group/link border border-white/10 hover:border-[#e2ff3d]/30 transition-all bg-black/40 p-1 rounded-xl">
                                    <div className="flex-1 font-mono text-[10px] text-white/40 px-4 truncate select-all py-3 tracking-wide">
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
                                        className="bg-[#e2ff3d] hover:bg-white text-black text-[10px] font-black uppercase px-6 py-3 transition-colors shrink-0 flex items-center gap-2 rounded-lg"
                                    >
                                        [ COPY ]
                                    </button>
                                </div>

                                <div className="text-[8px] font-mono text-white/30 uppercase tracking-widest flex justify-between px-1">
                                    <span>// SECURE_SHARE_AUTH</span>
                                    <span className="text-white/20">VALID_NODE</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Network status */}
                    <div className="flex items-center gap-6 opacity-30 mt-8 pl-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${redisStatus?.connected ? 'bg-[#e2ff3d] animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-[9px] font-mono text-white uppercase tracking-widest">
                                Network: {redisStatus?.connected ? 'STABLE' : 'UNSTABLE'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-white/40" />
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

                {/* 1. DAILY STREAK */}
                <section className="mt-4 lg:mt-0 border-t border-white/5 pt-4">
                    <StreakTracker
                        faucetStreak={data?.streaks?.faucet_streak || 0}
                        stakeStreak={data?.streaks?.stake_streak || 0}
                        lastFaucetDate={data?.streaks?.last_faucet_date || null}
                        lastStakeDate={data?.streaks?.last_stake_date || null}
                    />
                </section>

                {/* 2. ACTIVE MISSIONS */}
                <section className=" pt-8 lg:pt-12">
                    <div className="flex items-center gap-4 mb-6 lg:mb-8">
                        <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">
                            Active <span className="text-[#e2ff3d]">Assignments</span>
                        </h2>
                        <div className="h-px flex-1 bg-white/10" />
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

                {/* 3. STAKING MISSIONS */}
                <div className="border-t border-white/5 pt-8 lg:pt-12">
                    <InstitutionalTasks
                        userProfile={userProfile}
                        address={address || ''}
                        onUpdate={() => fetchData()}
                    />
                </div>

                {/* 4. INVITE MILESTONE REWARDS */}
                <section className="border-t border-white/5 pt-8 lg:pt-12">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 lg:mb-8 gap-3">
                        <div className="flex items-center gap-4 flex-1">
                            <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">
                                Referral <span className="text-[#e2ff3d]">Rewards</span>
                            </h2>
                            <div className="h-px flex-1 bg-white/10 hidden lg:block" />
                        </div>
                        <div className="flex gap-3">
                            {/* Total Invites */}
                            <div className="bg-white/[0.02] border border-white/10 px-5 py-3 min-w-[140px] rounded-xl text-right">
                                <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-1">Total Invites</span>
                                <span className="text-2xl font-black text-white tracking-tighter tabular-nums">{referralInfo?.stats?.total_referrals || 0}</span>
                            </div>
                            {/* Verified Invites */}
                            <div className="bg-[#e2ff3d]/[0.02] border border-[#e2ff3d]/20 px-5 py-3 min-w-[140px] rounded-xl text-right shadow-[0_0_20px_rgba(226,255,61,0.05)]">
                                <span className="text-[9px] font-mono text-[#e2ff3d]/60 uppercase tracking-widest block mb-1">Verified Invites</span>
                                <span className="text-2xl font-black text-[#e2ff3d] tracking-tighter tabular-nums">{referralInfo?.stats?.verified_referrals || 0}</span>
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

