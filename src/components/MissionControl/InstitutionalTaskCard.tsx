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
        <div
            onClick={handleClaim}
            className={`
                group relative border transition-all duration-300 overflow-hidden cursor-pointer
                ${isCompleted
                    ? 'bg-[#0a0a0a] border-[#e2ff3d]/50 hover:border-[#e2ff3d] hover:shadow-[0_0_30px_rgba(226,255,61,0.1)]'
                    : 'bg-[#0a0a0a] border-zinc-800 hover:border-[#e2ff3d]/40 hover:shadow-[0_0_40px_rgba(226,255,61,0.06)]'
                }
            `}
        >
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${isCompleted ? 'via-[#e2ff3d]' : 'via-[#e2ff3d]/50'} to-transparent`} />

            {/* Card Content */}
            <div className="p-3 lg:p-5">
                {/* Row 1: Status Badge + Reward */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Status Badge */}
                    <span className={`
                        text-[7px] lg:text-[9px] font-mono uppercase tracking-wider px-1.5 lg:px-2 py-0.5 border shrink-0
                        ${isCompleted
                            ? 'border-[#e2ff3d] text-black bg-[#e2ff3d] font-black animate-pulse'
                            : 'border-[#e2ff3d]/30 text-[#e2ff3d] bg-[#e2ff3d]/[0.08]'
                        }
                    `}>
                        {isCompleted ? 'CLAIM_READY' : 'IN_PROGRESS'}
                    </span>

                    {/* Reward Info */}
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-zinc-600 font-mono text-[9px]">REWARD:</span>
                        <span className="text-[#e2ff3d]">{badge.icon}</span>
                        <span className="font-bold text-white">{badge.name}</span>
                        <span className="text-zinc-700">|</span>
                        <span className="font-black text-[#e2ff3d] flex items-center gap-0.5">
                            +{badge.rewardPoints}
                            <Zap size={10} />
                        </span>
                    </div>
                </div>

                {/* Row 2: Title + Bonus Badge */}
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight text-white">
                        {badge.taskTitle}
                    </h3>
                    {badge.bonusText && (
                        <span className="text-[7px] lg:text-[8px] font-black uppercase px-1.5 py-0.5 bg-[#e2ff3d] text-black tracking-wider animate-pulse shrink-0">
                            {badge.bonusText}
                        </span>
                    )}
                </div>

                {/* Row 3: Description */}
                <p className="font-mono text-[10px] lg:text-xs leading-relaxed text-zinc-400">
                    {badge.description}
                </p>
            </div>

            {/* Footer with Progress - Ultra compact on mobile */}
            <div className="px-3 lg:px-5 py-2 lg:py-3 border-t border-zinc-800/50 bg-zinc-900/20">
                {/* Progress Info */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Progress Bar - Inline */}
                        <div className="h-1 flex-1 bg-zinc-800 overflow-hidden max-w-[100px] lg:max-w-[150px]">
                            <div
                                className={`h-full transition-all duration-500 ${isCompleted ? 'bg-[#e2ff3d] shadow-[0_0_10px_#e2ff3d]' : 'bg-zinc-600'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className={`text-[9px] lg:text-[10px] font-mono ${isCompleted ? 'text-[#e2ff3d]' : 'text-zinc-500'}`}>
                            {Math.floor(currentAmount).toLocaleString()} / {badge.targetAmount.toLocaleString()}
                        </span>
                    </div>

                    {/* Action Text */}
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin text-[#e2ff3d]" />
                            <span className="text-[#e2ff3d] text-[9px] lg:text-[10px] font-mono uppercase">
                                Processing...
                            </span>
                        </div>
                    ) : isCompleted ? (
                        <span className="text-[#e2ff3d] text-[9px] lg:text-[10px] font-mono font-bold uppercase">
                            CLAIM NOW →
                        </span>
                    ) : (
                        <div className="flex items-center gap-1 text-zinc-500 text-[9px] lg:text-[10px] font-mono uppercase">
                            <span>{badge.actionText}</span>
                            <ExternalLink size={10} className="opacity-60" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
