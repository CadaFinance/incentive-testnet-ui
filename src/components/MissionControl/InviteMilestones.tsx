'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Lock, TrendingUp } from 'lucide-react';

interface Milestone {
    id: number;
    name: string;
    description: string;
    required_verified_invites: number;
    reward_points: number;
    icon: string;
    tier_order: number;
    is_unlocked: boolean;
    is_claimed: boolean;
    can_claim: boolean;
}

interface InviteMilestonesResponse {
    current_verified_invites: number;
    milestones: Milestone[];
}

interface InviteMilestonesProps {
    address: string;
}

export function InviteMilestones({ address }: InviteMilestonesProps) {
    const [data, setData] = useState<InviteMilestonesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<number | null>(null);

    const fetchMilestones = async () => {
        try {
            const res = await fetch(`/api/invite-milestones?address=${address}&_t=${Date.now()}`);
            if (!res.ok) throw new Error('Failed to fetch milestones');
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Fetch milestones error:', error);
            toast.error('Failed to load network milestones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (address) {
            fetchMilestones();
        }
    }, [address]);

    const handleClaim = async (milestoneId: number, milestoneName: string) => {
        setClaiming(milestoneId);

        try {
            const res = await fetch('/api/invite-milestones/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, milestone_id: milestoneId })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Claim failed');
            }

            toast.success(`${milestoneName} Complete! +${result.points_awarded} XP`, {
                duration: 4000,
                icon: '🎉'
            });

            // Refetch to update UI
            await fetchMilestones();

        } catch (error: any) {
            console.error('Claim error:', error);

            const errorMessages: Record<string, string> = {
                'ALREADY_CLAIMED': 'You already claimed this milestone',
                'INSUFFICIENT_INVITES': 'Not enough verified invites',
                'MILESTONE_NOT_FOUND': 'Milestone not found',
                'MILESTONE_INACTIVE': 'This milestone is no longer active'
            };

            toast.error(errorMessages[error.message] || 'Claim failed. Please try again.');
        } finally {
            setClaiming(null);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[240px] bg-zinc-900 border border-white/5" />
                ))}
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-zinc-600 font-mono text-xs">
                // UNABLE TO LOAD NETWORK MILESTONES
            </div>
        );
    }



    // Filter out claimed milestones (hide them)
    const visibleMilestones = data.milestones.filter(m => !m.is_claimed);

    if (visibleMilestones.length === 0) {
        return (
            <div className="border border-white/5 bg-[#0b0b0b] py-16 flex flex-col items-center justify-center gap-4">
                <TrendingUp className="text-[#e2ff3d] w-10 h-10 opacity-50" />
                <span className="text-gray-600 font-mono text-xs uppercase tracking-widest">
                    // ALL MILESTONES COMPLETED
                </span>
                <span className="text-white font-black text-2xl">
                    {data.current_verified_invites} Verified Invites
                </span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleMilestones.map((milestone) => {
                const isLocked = !milestone.is_unlocked;
                const isClaiming = claiming === milestone.id;
                const canInteract = milestone.can_claim && !isClaiming;


                return (
                    <div
                        key={milestone.id}
                        onClick={canInteract ? () => handleClaim(milestone.id, milestone.name) : undefined}
                        className={`
                            group relative border p-4 lg:p-6 transition-all duration-300 overflow-hidden
                            ${isLocked
                                ? 'bg-[#0a0a0a] border-white/[0.03] cursor-not-allowed filter grayscale opacity-50'
                                : 'bg-[#080808] border-[#e2ff3d]/30 hover:border-[#e2ff3d] hover:bg-[#e2ff3d]/[0.02] cursor-pointer shadow-[0_0_30px_rgba(226,255,61,0.08)]'
                            }
                        `}
                    >
                        {/* Glow effect for unlocked */}
                        {!isLocked && (
                            <>
                                <div className="absolute inset-0 bg-[#e2ff3d]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e2ff3d] to-transparent animate-pulse" />
                            </>
                        )}

                        {/* Lock watermark */}
                        {isLocked && (
                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
                                <Lock size={100} strokeWidth={1} />
                            </div>
                        )}

                        <div className="relative z-10 space-y-4">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-3 relative z-10">
                                <div>
                                    <span className={`
                                        text-[8px] lg:text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border block 
                                        ${isLocked
                                            ? 'border-white/5 text-zinc-700'
                                            : 'border-[#e2ff3d]/20 text-[#e2ff3d] bg-[#e2ff3d]/10 animate-pulse'
                                        }
                                    `}>
                                        {isLocked ? 'LOCKED' : 'READY'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-mono ${isLocked ? 'text-zinc-700' : 'text-zinc-600'}`}>REWARD:</span>
                                    <div className={`text-lg lg:text-xl font-black font-mono ${isLocked ? 'text-zinc-600' : 'text-white'}`}>
                                        +{milestone.reward_points.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={`text-base lg:text-lg font-bold uppercase tracking-tight mb-1.5 relative z-10 ${isLocked ? 'text-zinc-500' : 'text-white'}`}>
                                    {milestone.name}
                                </h3>
                                <p className={`font-mono text-[10px] lg:text-xs leading-relaxed max-w-[90%] relative z-10 ${isLocked ? 'text-zinc-700' : 'text-zinc-500'}`}>
                                    {milestone.description}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-mono">
                                    <span className={isLocked ? 'text-zinc-700' : 'text-zinc-500'}>Verified Invites</span>
                                    <span className={isLocked ? 'text-zinc-600' : 'text-white'}>
                                        {Math.min(data.current_verified_invites, milestone.required_verified_invites)} / {milestone.required_verified_invites}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-900 border border-white/5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${isLocked ? 'bg-zinc-700' : 'bg-[#e2ff3d] shadow-[0_0_10px_rgba(226,255,61,0.5)]'}`}
                                        style={{
                                            width: `${Math.min(100, (data.current_verified_invites / milestone.required_verified_invites) * 100)}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/[0.03]">
                                {isLocked ? (
                                    <div className="flex items-center justify-between text-zinc-700">
                                        <span className="text-[9px] font-mono uppercase tracking-widest">
                                            {milestone.required_verified_invites - data.current_verified_invites} More Invites Needed
                                        </span>
                                        <Lock size={12} />
                                    </div>
                                ) : isClaiming ? (
                                    <div className="flex items-center gap-2 text-[#e2ff3d] text-[9px] font-mono">
                                        <div className="w-3 h-3 border-t-2 border-[#e2ff3d] border-r-2 border-transparent rounded-full animate-spin" />
                                        <span className="animate-pulse tracking-widest uppercase">Claiming...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between text-[#e2ff3d]/60 text-[9px] font-bold uppercase tracking-[0.2em] group-hover:text-[#e2ff3d] transition-colors">
                                        <span>// CLAIM_REWARD</span>
                                        <span className="text-lg leading-none transform group-hover:translate-x-1 transition-transform">›</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
