'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Lock, Zap } from 'lucide-react';

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
    multiplier?: number;
    onTelegramVerify?: () => void;
}

export function MissionCard({ id, title, description, reward, isCompleted, verificationLink, timeLeft: initialTimeLeft, onComplete, requiresVerification, isUserVerified, multiplier = 1.0, onTelegramVerify }: MissionCardProps) {
    const { address } = useAccount();
    const [loading, setLoading] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    const isLocked = requiresVerification && !isUserVerified;

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

        // Special handling for dynamic daily tasks (ID < 0)
        if (id < 0 && verificationLink) {
            window.location.href = verificationLink;
            return;
        }

        if (verificationLink) {
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
        <div
            onClick={!isCompleted && !isLocked ? handleAction : undefined}
            className={`
                group relative border p-4 lg:p-6 cursor-pointer transition-all duration-300 overflow-hidden
                ${isCompleted
                    ? 'bg-[#060606] border-white/[0.03] opacity-40'
                    : isLocked
                        ? 'bg-[#0a0a0a] border-red-500/10 cursor-not-allowed filter grayscale-[0.8] opacity-70'
                        : 'bg-[#080808] border-white/5 hover:border-[#e2ff3d]/50 hover:bg-[#e2ff3d]/[0.01]'
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
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            <div className="flex justify-between items-center mb-3 relative z-10">
                <span className={`
                    text-[8px] lg:text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border 
                    ${isCompleted
                        ? 'border-white/5 text-gray-700'
                        : isLocked
                            ? 'border-red-500/20 text-red-500/50 bg-red-500/5'
                            : 'border-white/10 text-zinc-500 group-hover:text-[#e2ff3d] group-hover:border-[#e2ff3d]/20'
                    }
                `}>
                    {isCompleted ? 'ARCHIVED' : isLocked ? 'LOCKED' : 'PROTOCOL_REQ'}
                </span>

                <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono ${isCompleted ? 'text-gray-800' : isLocked ? 'text-zinc-700' : 'text-zinc-600'}`}>REWARD:</span>
                    <span className={`text-lg lg:text-xl font-black font-mono flex items-center gap-1 ${isCompleted ? 'text-gray-800' : isLocked ? 'text-zinc-500' : 'text-white'}`}>
                        <span>+{Math.floor(reward * multiplier)}</span>
                        {multiplier > 1 && !isCompleted && !isLocked && <Zap size={10} className="text-[#e2ff3d] animate-pulse" />}
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
                {isCompleted && (secondsLeft !== null && secondsLeft > 0) ? (
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest">Re-Sync Available In:</span>
                        <span className="text-sm font-mono text-orange-500/80 tracking-tighter">{formatTime(secondsLeft)}</span>
                    </div>
                ) : isCompleted ? (
                    <div className="flex items-center gap-2 text-green-500/30">
                        <div className="w-1 h-1 rounded-full bg-green-500/50" />
                        <span className="text-[9px] font-mono uppercase tracking-widest">Protocol_Archived</span>
                    </div>
                ) : isLocked ? (
                    <div className="flex items-center justify-between bg-red-500/[0.03] px-3 py-2 border border-red-500/10">
                        <span className="text-red-500/40 text-[9px] font-black uppercase tracking-[0.15em] font-mono">
                             // X CONNECTION REQUIRED
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
    );
}
