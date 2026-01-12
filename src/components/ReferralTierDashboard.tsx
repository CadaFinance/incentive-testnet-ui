
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Shield, Sword, Crown, Zap, User } from 'lucide-react';
import { REFERRAL_TIERS } from '@/lib/referral_constants';

interface TierDashboardProps {
    currentTierName: string;
    currentMultiplier: number; // 1.1, 1.25 etc
    progress: {
        percent: number;
        invites: { current: number; required: number };
        xp: { current: number; required: number };
    };
    nextTierName: string;
}

export function ReferralTierDashboard({ currentTierName, currentMultiplier, progress, nextTierName }: TierDashboardProps) {

    // Map icons to tiers
    const getIcon = (name: string) => {
        switch (name) {
            case 'SCOUT': return <Shield className="w-4 h-4" />;
            case 'VANGUARD': return <Sword className="w-4 h-4" />;
            case 'ELITE': return <User className="w-4 h-4" />; // Elite Eagle replacement
            case 'LEGEND': return <Crown className="w-4 h-4" />;
            case 'MYTHIC': return <Zap className="w-4 h-4" />;
            default: return <Shield className="w-4 h-4" />;
        }
    }

    return (
        <div className="space-y-8 mt-8">
            {/* Header: Current Status */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Current Rank</span>
                        <div className="px-2 py-0.5 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 text-[#e2ff3d] text-[9px] font-black uppercase tracking-widest rounded-sm">
                            {currentMultiplier}X Multiplier Active
                        </div>
                    </div>
                    <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">
                        {currentTierName}
                    </h2>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Next Objective</span>
                    <div className="text-xl font-bold text-white tracking-tight flex items-center justify-end gap-2">
                        {nextTierName === 'MAX_LEVEL' ? 'MAX RANK' : nextTierName} <span className="text-sm text-gray-600">/ {progress.percent}%</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar (Overall) */}
            {nextTierName !== 'MAX_LEVEL' && (
                <div className="space-y-2">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress.percent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-[#e2ff3d]"
                        />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono uppercase text-gray-500">
                        <span>Progress to {nextTierName}</span>
                        <div className="flex gap-4">
                            <span className={progress.invites.current >= progress.invites.required ? 'text-[#e2ff3d]' : ''}>
                                INVITES: {progress.invites.current}/{progress.invites.required}
                            </span>
                            <span className={progress.xp.current >= progress.xp.required ? 'text-[#e2ff3d]' : ''}>
                                XP: {progress.xp.current}/{progress.xp.required}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tier Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {REFERRAL_TIERS.map((tier, idx) => {
                    const isUnlocked = tier.multiplier <= currentMultiplier;
                    const isNext = tier.name === nextTierName;
                    const isCurrent = tier.name === currentTierName;

                    return (
                        <div
                            key={tier.name}
                            className={`
                                relative p-4 border flex flex-col justify-between min-h-[120px] transition-all
                                ${isCurrent
                                    ? 'bg-[#e2ff3d]/10 border-[#e2ff3d] shadow-[0_0_20px_rgba(226,255,61,0.1)]'
                                    : isUnlocked
                                        ? 'bg-white/5 border-white/20'
                                        : 'bg-black/40 border-white/5 opacity-50 grayscale'
                                }
                            `}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className={`p-1.5 rounded-sm ${isCurrent ? 'bg-[#e2ff3d] text-black' : 'bg-white/10 text-white'}`}>
                                    {getIcon(tier.name)}
                                </div>
                                {isUnlocked ? (
                                    <Check size={12} className={isCurrent ? "text-[#e2ff3d]" : "text-gray-500"} />
                                ) : (
                                    <Lock size={12} className="text-gray-600" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="mt-4">
                                <div className="text-[10px] font-black uppercase tracking-wider text-white">
                                    {tier.name}
                                </div>
                                <div className="text-[9px] font-mono text-gray-400 mt-1">
                                    {tier.minInvites} INT / {tier.minXP} XP
                                </div>
                            </div>

                            {/* Footer: Multiplier */}
                            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                                <span className="text-[8px] uppercase tracking-widest text-gray-500">Boost</span>
                                <span className={`text-[10px] font-black font-mono ${isCurrent ? 'text-[#e2ff3d]' : 'text-white'}`}>
                                    {tier.multiplier}x
                                </span>
                            </div>

                            {/* Current Indicator */}
                            {isCurrent && (
                                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#e2ff3d] text-black text-[7px] font-black uppercase tracking-widest">
                                    CURRENT
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
