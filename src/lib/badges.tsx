import React from 'react';
import { Webhook, BowArrow, ChessKing } from 'lucide-react';

export type BadgeId = 'INSTITUTIONAL_STAKER' | 'COMPOUND_ARCHITECT' | 'YIELD_HARVESTER';

export interface BadgeDef {
    id: BadgeId;
    name: string;
    taskTitle: string; // Action-oriented title
    description: string;
    icon: React.ReactNode;
    color: string;
    glowColor: string;
    targetAmount: number;
    rewardPoints: number;
    actionText: string;
    bonusText?: string; // Optional special perk text
}

export const INSTITUTIONAL_BADGES: Record<BadgeId, BadgeDef> = {
    'INSTITUTIONAL_STAKER': {
        id: 'INSTITUTIONAL_STAKER',
        name: 'Titan',
        taskTitle: 'STAKE +5,000 vZUG',
        description: 'Deposit 5,000+ vZUG into the staking vault.',
        icon: <Webhook className="w-3 h-3" />,
        color: 'text-[#e2ff3d]',
        glowColor: 'shadow-[#e2ff3d]/50',
        targetAmount: 5000,
        rewardPoints: 7500,
        actionText: 'STAKE NOW',
        bonusText: '4X $USDZ MULTIPLIER'
    },
    'COMPOUND_ARCHITECT': {
        id: 'COMPOUND_ARCHITECT',
        name: 'Warlord',
        taskTitle: 'AUTO-COMPOUND +100 vZUG',
        description: 'Reinvest 100+ vZUG rewards back into the pool.',
        icon: <BowArrow className="w-3 h-3" />,
        color: 'text-[#e2ff3d]',
        glowColor: 'shadow-[#e2ff3d]/50',
        targetAmount: 100,
        rewardPoints: 2500,
        actionText: 'COMPOUND NOW'
    },
    'YIELD_HARVESTER': {
        id: 'YIELD_HARVESTER',
        name: 'Predator',
        taskTitle: 'CLAIM +50 vZUG REWARDS',
        description: 'Extract 50+ vZUG yield to your wallet.',
        icon: <ChessKing className="w-3 h-3" />,
        color: 'text-[#e2ff3d]',
        glowColor: 'shadow-[#e2ff3d]/50',
        targetAmount: 50,
        rewardPoints: 1000,
        actionText: 'CLAIM YIELD NOW'
    }
};

export const getUSDZMultiplier = (badges: string[] | undefined): number => {
    if (!badges || !Array.isArray(badges)) return 0.0025;
    if (badges.includes('INSTITUTIONAL_STAKER')) {
        return 0.01; // 4x Booster for Guardians
    }
    return 0.0025;
};
