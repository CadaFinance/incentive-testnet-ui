'use client';

interface StreakProps {
    faucetStreak: number;
    stakeStreak: number;
    lastFaucetDate: string | null;
    lastStakeDate: string | null;
}

export function StreakTracker({ faucetStreak, stakeStreak, lastFaucetDate, lastStakeDate }: StreakProps) {
    const streakDays = [1, 2, 3, 4, 5, 6, 7];
    // Enterprise Grade Cycle Logic
    // If streak is 7 but NOT completed today, we are effectively on "Day 8" (Pending Day 1 of Next Cycle)
    // We want the UI to urge the user to start Day 1, rather than resting on the laurel of Day 7.

    // 1. Determine if action is done today (UTC Check to match backend)
    const today = new Date().toISOString().split('T')[0];
    const lastFaucet = lastFaucetDate ? lastFaucetDate.split('T')[0] : '';
    const lastStake = lastStakeDate ? lastStakeDate.split('T')[0] : '';
    const isTodayDone = lastFaucet === today && lastStake === today;

    // 2. Calculate Base Streak (0-7+)
    const rawStreak = Math.min(faucetStreak, stakeStreak);

    // 3. Determine Visual Step (1-7)
    let displayStep = rawStreak;

    // Cycle Reset Condition:
    // If we have >= 7 points AND we haven't finished today's tasks...
    // Then we are technically "Pending Day 1" of the NEW cycle.
    if (rawStreak >= 7 && !isTodayDone) {
        displayStep = 0; // 0 means "0 completed", so Day 1 is next/pending
    } else {
        // Cap visual at 7 for standard display
        displayStep = Math.min(rawStreak, 7);
    }

    return (
        <div className="w-full pb-2 mb-2 lg:pb-2 lg:mb-2 relative">
            {/* DEBUG OVERLAY */}


            <div className="flex items-center gap-4 mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-4xl font-black uppercase text-white tracking-tighter m-0">
                    Daily <span className="text-[#e2ff3d]">Streak</span>
                </h2>
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-base lg:text-xl font-mono font-bold text-[#e2ff3d] whitespace-nowrap">
                    {displayStep === 0 ? 'START CYCLE' : `${displayStep} / 7 DAYS`}
                </span>
            </div>

            {/* Responsive Grid Tracker */}
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-1 lg:gap-2">
                {streakDays.map((day) => {
                    const isActive = day <= displayStep;
                    const isNext = day === displayStep + 1;

                    return (
                        <div
                            key={day}
                            className={`
                                relative flex flex-col justify-between p-2 lg:p-3 border transition-all duration-300 h-16 lg:h-24
                                ${isActive
                                    ? 'bg-[#e2ff3d] border-[#e2ff3d]'
                                    : 'bg-transparent border-white/10'
                                }
                                ${day === 7 ? 'col-span-1' : ''}
                            `}
                        >
                            <span className={`
                                text-[8px] lg:text-[10px] font-mono font-bold uppercase tracking-widest
                                ${isActive ? 'text-black' : 'text-gray-600'}
                            `}>
                                Day 0{day}
                            </span>

                            {isActive && (
                                <span className="text-[9px] lg:text-xs font-black text-black uppercase tracking-tight self-end">
                                    {/* Shorter text on mobile if space counts */}
                                    <span className="hidden lg:inline">COMPLETED</span>
                                    <span className="inline lg:hidden">DONE</span>
                                </span>
                            )}

                            {!isActive && isNext && (
                                <span className="text-[8px] lg:text-[10px] font-mono text-white/40 uppercase tracking-tight self-end animate-pulse">
                                    PENDING
                                </span>
                            )}
                        </div>
                    );
                })}
                {/* Visual Filler for mobile grid (4x2) */}
                <div className="lg:hidden flex items-center justify-center border border-white/5 opacity-20">
                    <span className="text-[8px] font-mono text-zinc-600">// END</span>
                </div>
            </div>

            <div className="flex items-center justify-between mt-4">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                    BONUS REWARD:
                </p>
                <div className=" px-3 py-1">
                    <span className="text-[10px] lg:text-xs text-[#e2ff3d] font-black uppercase tracking-widest">
                        +1000 XP ON DAY 7
                    </span>
                </div>
            </div>
        </div>
    );
}
