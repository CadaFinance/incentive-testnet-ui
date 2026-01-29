import { INSTITUTIONAL_BADGES, BadgeId } from '@/lib/badges';
import { InstitutionalTaskCard } from './InstitutionalTaskCard';
import { toast } from 'sonner';

interface InstitutionalTasksProps {
    userProfile: any;
    address: string;
    onUpdate: () => void;
}

export function InstitutionalTasks({ userProfile, address, onUpdate }: InstitutionalTasksProps) {
    const badges = userProfile?.badges || [];

    // Helper to get current amount for a specific badge
    const getStatForBadge = (id: BadgeId): number => {
        switch (id) {
            case 'INSTITUTIONAL_STAKER': return parseFloat(userProfile?.vzug_staked || '0');
            case 'COMPOUND_ARCHITECT': return parseFloat(userProfile?.vzug_compounded || '0');
            case 'YIELD_HARVESTER': return parseFloat(userProfile?.vzug_claimed || '0');
            default: return 0;
        }
    };

    const handleClaimBadge = async (badgeId: BadgeId) => {
        try {
            const res = await fetch('/api/incentive/claim-badge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: address,
                    badgeId
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Claim Failed');

            toast.success(`Badge Unlocked: ${INSTITUTIONAL_BADGES[badgeId].name}!`, {
                description: 'Your leaderboard status has been upgraded.'
            });
            onUpdate(); // Refetch data
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // Calculate how many visible masks (uncompleted) there are
    // If all are completed (hidden), we might not want to render the section header? 
    // But the requirements say "Hide Completed Tasks". 
    // If all badges owned, section will be empty.
    const visibleBadges = Object.values(INSTITUTIONAL_BADGES).filter(b => !badges.includes(b.id));

    if (visibleBadges.length === 0) return null;

    return (
        <section className="mb-12">
            <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">
                    Staking <span className="text-[#e2ff3d]">Missions</span>
                </h2>
                <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {visibleBadges.map((badge) => (
                    <InstitutionalTaskCard
                        key={badge.id}
                        badge={badge}
                        currentAmount={getStatForBadge(badge.id as BadgeId)}
                        hasBadge={badges.includes(badge.id)} // Redundant check but safe
                        onClaim={() => handleClaimBadge(badge.id as BadgeId)}
                    />
                ))}
            </div>
        </section>
    );
}
