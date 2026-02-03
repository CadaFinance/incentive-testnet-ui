import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Lock, Zap } from 'lucide-react';
import { TweetVerifyModal } from './TweetVerifyModal';
import { XProfileUpdateModal } from './XProfileUpdateModal';

interface MissionCardProps {
    id: number;
    title: string;
    description: string;
    reward: number;
    type: 'SOCIAL' | 'PARTNER' | 'DAILY';
    isCompleted: boolean;
    verificationLink?: string;
    timeLeft?: number; // In seconds
    onComplete: () => void;
    requiresVerification?: boolean;
    isUserVerified?: boolean;
    isDiscordLinked?: boolean;
    multiplier?: number;
    onTelegramVerify?: () => void;
    locked?: boolean;
    lockedMessage?: string;
    referralCode?: string;
}

export function MissionCard({ id, title, description, reward, type, isCompleted, verificationLink, timeLeft: initialTimeLeft, onComplete, requiresVerification, isUserVerified, isDiscordLinked, multiplier = 1.0, onTelegramVerify, locked = false, lockedMessage = '// ACCESS DENIED', referralCode }: MissionCardProps) {
    const { address } = useAccount();
    const [loading, setLoading] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [showTweetVerifyModal, setShowTweetVerifyModal] = useState(false);
    const [showXProfileModal, setShowXProfileModal] = useState(false);

    const isLocked = locked || (requiresVerification && !isUserVerified);

    // ... (keep useEffects) ...

    useEffect(() => {
        if (initialTimeLeft !== undefined) {
            setSecondsLeft(initialTimeLeft);
        }
    }, [initialTimeLeft]);

    useEffect(() => {
        if (secondsLeft === null || secondsLeft <= 0) return;

        const timer = setInterval(() => {
            setSecondsLeft(prev => (prev && prev > 0) ? prev - 1 : 0);
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsLeft]);

    const formatTime = (totalSeconds: number) => {
        // ... (keep formatTime) ...
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h}H ${m}M ${s}S`;
    };

    const handleAction = async () => {
        if (isCompleted || isLocked) return;

        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        // Handle Telegram Login Trigger
        if (verificationLink === 'TELEGRAM_LOGIN') {
            onTelegramVerify?.();
            return;
        }

        // Handle Discord Login Trigger
        if (verificationLink === 'DISCORD_LOGIN') {
            if (isDiscordLinked) {
                // SMART VERIFY: Already linked, call verify API directly
                setLoading(true);
                try {
                    const res = await fetch('/api/missions/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ address, taskId: id })
                    });
                    const data = await res.json();

                    if (!res.ok) {
                        if (data.error?.includes('Join server first')) {
                            // User is linked but not in guild -> Open invite link
                            window.open('https://discord.com/invite/dV2sQtnQEu', '_blank');
                            toast.info("Please join our Discord server first. After joining, click verify again!");
                            return;
                        }
                        throw new Error(data.error || 'Verification Failed');
                    }

                    const earned = data.points_awarded || Math.floor(reward * multiplier);
                    toast.success(`Mission Complete! +${earned} Points`);
                    onComplete();
                    return; // Exit early on success
                } catch (e: any) {
                    toast.error(e.message || "Something went wrong");
                    return;
                } finally {
                    setLoading(false);
                }
            } else {
                window.location.href = `/api/auth/discord/login?address=${address}&trigger=mission_click&taskId=${id}`;
                return;
            }
        }

        // Helper for smart linking
        const openLink = (url: string) => {
            // Check if mobile (basic check)
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // Transform Telegram links to deep links on mobile
            if (isMobile && url.includes('t.me/')) {
                const deepUrl = url.replace('https://t.me/', 'tg://resolve?domain=');
                window.location.href = deepUrl;
                return;
            }

            // Transform Twitter/X links to deep links on mobile
            if (isMobile && (url.includes('twitter.com') || url.includes('x.com'))) {
                // For intents, window.location.href often triggers the app better than window.open
                window.location.href = url;
                return;
            }

            // Default behavior
            window.open(url, '_blank');
        };

        // Special handling for dynamic daily tasks (ID < 0)
        // Exclude tweet task state flags (CLICKED/NOT_CLICKED) as they're handled separately below
        // Also exclude X_PROFILE_MODAL which is handled by modal
        if (id < 0 && verificationLink && !['CLICKED', 'NOT_CLICKED', 'X_PROFILE_MODAL'].includes(verificationLink)) {
            openLink(verificationLink);
            return;
        }

        // Handle X Profile Update Modal
        if (verificationLink === 'X_PROFILE_MODAL') {
            setShowXProfileModal(true);
            return;
        }

        // Handle Dynamic Twitter Reply Intent
        if (verificationLink?.startsWith('TWITTER_INTENT_REPLY:')) {
            const tweetId = verificationLink.split(':')[1];
            const text = encodeURIComponent(`Just joined the @ZugChain_org Incentivized Testnet 🚀  \n\nActively testing staking & reward mechanics ahead of TGE.  \n\nJoin here 👇 https://testnet.zugchain.org/?ref=${referralCode || 'ZUG'}`);
            openLink(`https://twitter.com/intent/tweet?in_reply_to=${tweetId}&text=${text}`);
        }

        // Handle New "Shoutout on X" (Tweet Task)
        if (type === 'SOCIAL' && verificationLink && ['CLICKED', 'NOT_CLICKED'].includes(verificationLink)) {
            // First time click: Open Intent & Track
            if (verificationLink === 'NOT_CLICKED') {
                const TWEET_TEXT = `Started my journey on the @ZugChain_org Incentive Testnet! 🚀\n\nEarning points, securing the network, and claiming my place in the genesis. Don't miss the early access phase.\n\nGet started here 👇\nhttps://testnet.zugchain.org/?ref=${referralCode || 'early'}\n\n#ZugChain`;
                const INTENT_URL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`;

                openLink(INTENT_URL);

                // Track the click in DB without waiting
                fetch('/api/missions/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address, taskId: id })
                }).then(() => {
                    // Refresh data to update state to 'CLICKED'
                    onComplete();
                });
                return;
            }

            // Second time click: Open Verification Modal
            if (verificationLink === 'CLICKED') {
                setShowTweetVerifyModal(true);
                return;
            }
        }

        else if (verificationLink && !['CLICKED', 'NOT_CLICKED'].includes(verificationLink) && !verificationLink.startsWith('TWITTER_INTENT_REPLY:')) {
            openLink(verificationLink);
        }

        setLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const res = await fetch('/api/missions/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, taskId: id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification Failed');

            // Use server-returned points which includes the multiplier
            const earned = data.points_awarded || Math.floor(reward * multiplier);

            if (multiplier > 1.0) {
                toast.success(`Mission Complete! +${earned} Points (${multiplier}x Boost Applied)`);
            } else {
                toast.success(`Mission Complete! +${earned} Points`);
            }

            onComplete();
        } catch (e: any) {
            toast.error(e.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // Get user-friendly locked reason
    const getLockedReason = () => {
        if (lockedMessage?.includes('TELEGRAM')) return 'Complete Telegram verification first';
        if (lockedMessage?.includes('DISCORD')) return 'Complete Discord verification first';
        if (lockedMessage?.includes('SERVER')) return 'Join Discord server first';
        if (lockedMessage?.includes('X') || lockedMessage?.includes('TWITTER')) return 'Connect your X account first';
        if (requiresVerification && !isUserVerified) return 'Connect your X account first';
        return 'Complete previous tasks first';
    };

    return (
        <>
            <div
                onClick={(!isCompleted && !isLocked) || id === -103 ? handleAction : undefined}
                className={`
                    group relative border transition-all duration-300 overflow-hidden rounded-2xl
                    ${isCompleted && id !== -103
                        ? 'bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed grayscale'
                        : isLocked && id !== -103
                            ? 'bg-white/[0.02] border-white/5 cursor-not-allowed'
                            : 'bg-white/[0.03] backdrop-blur-sm border-white/10 hover:border-[#e2ff3d]/40 cursor-pointer hover:shadow-[0_0_40px_rgba(226,255,61,0.06)]'
                    }
                `}
            >
                {/* Top accent line - only for active cards */}
                {!isCompleted && !isLocked && (
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d]/50 to-transparent" />
                )}

                {/* Card Content - Compact on mobile */}
                <div className="p-3 lg:p-5">
                    {/* Mobile: Inline header | Desktop: Separate row */}
                    <div className="flex items-center justify-between gap-2 mb-2 lg:mb-3">
                        <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                            {/* Status Badge - Smaller on mobile */}
                            <span className={`
                                text-[7px] lg:text-[9px] font-mono uppercase tracking-wider px-1.5 lg:px-2 py-0.5 border shrink-0
                                ${isLocked
                                    ? 'border-white/5 text-white/30 bg-white/5'
                                    : 'border-[#e2ff3d]/30 text-[#e2ff3d] bg-[#e2ff3d]/[0.08]'
                                }
                            `}>
                                {isLocked ? 'LOCKED' : 'ACTIVE'}
                            </span>

                            {/* Title - Inline on mobile */}
                            <h3 className={`text-sm lg:text-lg font-bold uppercase tracking-tight truncate ${isLocked ? 'text-white/30' : 'text-white'}`}>
                                {title}
                            </h3>
                        </div>

                        {/* Reward - Compact */}
                        <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-base lg:text-xl font-black tracking-tight ${isLocked ? 'text-white/30' : 'text-[#e2ff3d]'}`}>
                                +{Math.floor(reward * multiplier)}
                            </span>
                            {multiplier > 1 && !isLocked && (
                                <Zap size={10} className="text-[#e2ff3d]" />
                            )}
                        </div>
                    </div>

                    {/* Description - Smaller on mobile */}
                    <p className={`font-mono text-[10px] lg:text-xs leading-relaxed line-clamp-2 ${isLocked ? 'text-white/20' : 'text-white/40'}`}>
                        {description}
                    </p>
                </div>

                {/* Footer - Ultra compact on mobile */}
                <div className={`px-3 lg:px-5 py-2 lg:py-3 border-t ${isLocked ? 'border-white/5 bg-white/[0.01]' : 'border-white/5 bg-white/[0.02]'}`}>
                    {isLocked ? (
                        <div className="flex items-center gap-2">
                            <Lock size={12} className="text-white/20 shrink-0" />
                            <span className="text-white/20 text-[9px] lg:text-[10px] font-mono truncate">
                                {getLockedReason()}
                            </span>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-[#e2ff3d]/30 border-t-[#e2ff3d] rounded-full animate-spin" />
                            <span className="text-[#e2ff3d] text-[9px] lg:text-[10px] font-mono uppercase">
                                Processing...
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-white/40 text-[9px] lg:text-[10px] font-mono uppercase group-hover:text-[#e2ff3d] transition-colors">
                                Start Task
                            </span>
                            <span className="text-[#e2ff3d]/50 text-sm group-hover:text-[#e2ff3d] group-hover:translate-x-0.5 transition-all">
                                →
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tweet Verification Modal */}
            <TweetVerifyModal
                open={showTweetVerifyModal}
                onClose={() => setShowTweetVerifyModal(false)}
                walletAddress={address || ''}
                referralCode={referralCode}
                onVerified={() => {
                    setShowTweetVerifyModal(false);
                    onComplete();
                }}
            />

            {/* X Profile Update Modal */}
            <XProfileUpdateModal
                open={showXProfileModal}
                onClose={() => setShowXProfileModal(false)}
                walletAddress={address || ''}
                onVerified={() => {
                    setShowXProfileModal(false);
                    onComplete();
                }}
            />
        </>
    );
}
