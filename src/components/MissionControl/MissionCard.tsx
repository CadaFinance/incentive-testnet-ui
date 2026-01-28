import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Lock, Zap } from 'lucide-react';
import { TweetVerifyModal } from './TweetVerifyModal';

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

        // Special handling for dynamic daily tasks (ID < 0)
        // Exclude tweet task state flags (CLICKED/NOT_CLICKED) as they're handled separately below
        if (id < 0 && verificationLink && !['CLICKED', 'NOT_CLICKED'].includes(verificationLink)) {
            window.location.href = verificationLink;
            return;
        }

        // Handle Dynamic Twitter Reply Intent
        if (verificationLink?.startsWith('TWITTER_INTENT_REPLY:')) {
            const tweetId = verificationLink.split(':')[1];
            const text = encodeURIComponent(`Just joined the @ZugChain_org Incentivized Testnet! 💎\n\nBuilding the sovereign layer for digital capital. Join me here: https://testnet.zugchain.org/?ref=${referralCode || 'ZUG'}\n\n#ZugChain $ZUG #Testnet #Crypto`);
            window.open(`https://x.com/intent/post?in_reply_to=${tweetId}&text=${text}`, '_blank');
            // Removed early return to allow verification process to continue
        }

        // Handle New "Shoutout on X" (Tweet Task)
        if (type === 'SOCIAL' && verificationLink && ['CLICKED', 'NOT_CLICKED'].includes(verificationLink)) {
            // First time click: Open Intent & Track
            if (verificationLink === 'NOT_CLICKED') {
                const TWEET_TEXT = `Started my journey on the @ZugChain_org Incentive Testnet! 🚀\n\nEarning points, securing the network, and claiming my place in the genesis. Don't miss the early access phase.\n\nGet started here 👇\nhttps://testnet.zugchain.org/?ref=${referralCode || 'early'}\n\n#ZugChain $ZUG #ZUG`;
                const INTENT_URL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`;

                window.open(INTENT_URL, '_blank');

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

        else if (verificationLink && !['CLICKED', 'NOT_CLICKED'].includes(verificationLink)) {
            window.open(verificationLink, '_blank');
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

    return (
        <>
            <div
                onClick={(!isCompleted && !isLocked) || id === -103 ? handleAction : undefined}
                className={`
                    group relative border p-4 lg:p-6 transition-all duration-300 overflow-hidden
                    ${isCompleted && id !== -103
                        ? 'bg-[#060606] border-white/[0.03] opacity-40 cursor-not-allowed'
                        : isLocked && id !== -103
                            ? 'bg-[#0a0a0a] border-white/5 cursor-not-allowed filter grayscale opacity-70'
                            : 'bg-[#080808] border-[#e2ff3d]/30 hover:border-[#e2ff3d]/50 hover:bg-[#e2ff3d]/[0.02] cursor-pointer shadow-[0_0_30px_rgba(226,255,61,0.08)]'
                    }
                `}
            >
                {/* Locked Watermark */}
                {isLocked && (
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none rotate-12">
                        <Lock size={120} strokeWidth={1} />
                    </div>
                )}

                {/* Locked Pattern Overlay */}
                {isLocked && (
                    <div
                        className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(45deg, #ffffff 25%, transparent 25%, transparent 50%, #ffffff 50%, #ffffff 75%, transparent 75%, transparent)`,
                            backgroundSize: '4px 4px'
                        }}
                    />
                )}

                {/* Horizontal Line Indicator for Premium feel */}
                {!isCompleted && !isLocked && (
                    <>
                        <div className="absolute inset-0 bg-[#e2ff3d]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e2ff3d] to-transparent animate-pulse" />
                    </>
                )}

                <div className="flex justify-between items-center mb-3 relative z-10">
                    <span className={`
                        text-[8px] lg:text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border 
                        ${isLocked
                            ? 'border-red-500/20 text-red-500/50 bg-red-500/5'
                            : 'border-[#e2ff3d]/20 text-[#e2ff3d] bg-[#e2ff3d]/10 animate-pulse'
                        }
                    `}>
                        {isLocked ? 'LOCKED' : 'PROTOCOL_REQ'}
                    </span>

                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono ${isLocked ? 'text-zinc-700' : 'text-zinc-600'}`}>REWARD:</span>
                        <span className={`text-lg lg:text-xl font-black font-mono flex items-center gap-1 ${isLocked ? 'text-zinc-500' : 'text-white'}`}>
                            <span>+{Math.floor(reward * multiplier)}</span>
                            {multiplier > 1 && !isLocked && <Zap size={10} className="text-[#e2ff3d] animate-pulse" />}
                        </span>
                    </div>
                </div>

                <h3 className={`text-base lg:text-lg font-bold uppercase tracking-tight mb-1.5 relative z-10 ${isCompleted ? 'text-gray-800' : isLocked ? 'text-zinc-400' : 'text-white'}`}>
                    {title}
                </h3>

                <p className={`font-mono text-[10px] lg:text-xs leading-relaxed max-w-[90%] relative z-10 ${isCompleted ? 'text-zinc-900' : isLocked ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    {description}
                </p>

                {/* Action Area: Minimalist footer */}
                <div className="mt-5 pt-4 border-t border-white/[0.03] relative z-10">
                    {isLocked ? (
                        <div className="flex items-center justify-between bg-red-500/[0.03] px-3 py-2 border border-red-500/10">
                            <span className="text-red-500/40 text-[9px] font-black uppercase tracking-[0.15em] font-mono">
                                {lockedMessage}
                            </span>
                            <Lock size={12} className="text-red-500/40" />
                        </div>
                    ) : loading ? (
                        <div className="flex items-center gap-2 text-[#e2ff3d] text-[9px] font-mono">
                            <div className="w-3 h-3 border-t-2 border-[#e2ff3d] border-r-2 border-transparent rounded-full animate-spin" />
                            <span className="animate-pulse tracking-widest uppercase">Validating...</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-[#e2ff3d]/60 text-[9px] font-bold uppercase tracking-[0.2em] group-hover:text-[#e2ff3d] transition-colors">
                            <span className="flex items-center gap-2">
                                <span className="hidden lg:inline">// INIT_PROTOCOL_INTERFACE</span>
                                <span className="lg:hidden">// START_TASK</span>
                            </span>
                            <span className="text-lg leading-none transform group-hover:translate-x-1 transition-transform">›</span>
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
        </>
    );
}
