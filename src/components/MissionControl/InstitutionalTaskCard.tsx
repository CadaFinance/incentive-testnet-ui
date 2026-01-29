import { useState } from 'react';
import { BadgeDef } from '@/lib/badges';
import { Loader2, Zap, ExternalLink } from 'lucide-react';

interface InstitutionalTaskCardProps {
    badge: BadgeDef;
    currentAmount: number;
    hasBadge: boolean;
    onClaim: () => void;
}

export function InstitutionalTaskCard({ badge, currentAmount, hasBadge, onClaim }: InstitutionalTaskCardProps) {
    const [loading, setLoading] = useState(false);

    // GHOST MODE: If user has badge, do not render anything
    if (hasBadge) return null;

    const progress = Math.min(100, (currentAmount / badge.targetAmount) * 100);
    const isCompleted = currentAmount >= badge.targetAmount;

    const handleClaim = async () => {
        if (!isCompleted) {
            window.location.href = '/staking/vzug';
            return;
        }

        setLoading(true);
        try {
            await onClaim();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`
            relative p-6 bg-[#050505] border transition-all duration-300 overflow-hidden group
            ${isCompleted
                ? 'border-[#e2ff3d] hover:bg-[#e2ff3d]/[0.02] shadow-[0_0_20px_rgba(226,255,61,0.1)]'
                : 'border-white/10 hover:border-white/20'
            }
        `}>
            {/* Horizontal Line Indicator */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Header: Status & Reward */}
            <div className="flex justify-between items-center mb-4 relative z-10">
                <span className={`
                    text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border
                    ${isCompleted
                        ? 'bg-[#e2ff3d] text-black border-[#e2ff3d] font-black animate-pulse'
                        : 'bg-white/5 text-gray-400 border-white/10'
                    }
                `}>
                    {isCompleted ? 'CLAIM_READY' : 'IN_PROGRESS'}
                </span>

                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-600">REWARD:</span>
                    <span className="text-sm font-black text-white flex items-center gap-1">
                        <span className="text-[#e2ff3d]">{badge.icon}</span>
                        {badge.name}
                        <span className="text-zinc-600">|</span>
                        +{badge.rewardPoints}
                        <Zap size={10} className="text-[#e2ff3d]" />
                    </span>
                </div>
            </div>

            {/* Main Title - Task Action */}
            <div className="flex items-center gap-3 mb-2 relative z-10">
                <h3 className="text-lg font-black uppercase text-white tracking-tight">
                    {badge.taskTitle}
                </h3>
                {badge.bonusText && (
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-[#e2ff3d] text-black border border-[#e2ff3d] tracking-wider animate-pulse shadow-[0_0_12px_rgba(226,255,61,0.4)]">
                        {badge.bonusText}
                    </span>
                )}
            </div>

            {/* Description */}
            <p className="font-mono text-[10px] text-zinc-500 mb-6 max-w-[90%] relative z-10">
                {badge.description}
            </p>

            {/* Progress Bar Section */}
            <div className="relative z-10 space-y-2 mb-6">
                <div className="flex justify-between text-[9px] font-mono uppercase tracking-wider">
                    <span className="text-zinc-600">Completion Status</span>
                    <span className={isCompleted ? "text-[#e2ff3d] font-bold" : "text-white"}>
                        {Math.floor(currentAmount).toLocaleString()} / {badge.targetAmount.toLocaleString()}
                    </span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-none overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-[#e2ff3d] shadow-[0_0_10px_#e2ff3d]' : 'bg-zinc-700'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={handleClaim}
                disabled={loading}
                className={`
                    w-full py-3 relative z-10 text-[10px] font-black uppercase tracking-[0.2em] border transition-all
                    ${isCompleted
                        ? 'bg-[#e2ff3d] border-[#e2ff3d] text-black hover:bg-white hover:border-white shadow-[0_0_15px_rgba(226,255,61,0.2)]'
                        : 'bg-transparent border-white/10 text-zinc-500 hover:text-white hover:border-white/30'
                    }
                `}
            >
                {loading ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>PROCESSING...</span>
                    </div>
                ) : isCompleted ? (
                    "CLAIM_REWARD_PACKAGE"
                ) : (
                    <div className="flex items-center justify-center gap-2">
                        <span>{badge.actionText}</span>
                        <ExternalLink size={10} className="opacity-60" />
                    </div>
                )}
            </button>
        </div>
    );
}
