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
        <div className="w-full border-b border-white/5 pb-8 mb-8 lg:pb-12 lg:mb-12 relative">
            {/* DEBUG OVERLAY */}
            <div className="absolute top-0 right-0 p-2 bg-red-500/20 text-[10px] text-red-200 font-mono z-100">
                DEBUG INFO:<br />
                RawStreak: {rawStreak}<br />
                Today(UTC): {today}<br />
                LastFaucet: {lastFaucet}<br />
                IsTodayDone: {isTodayDone.toString()}<br />
                DisplayStep: {displayStep}
            </div>

            <div className="flex flex-col md:flex-row items-baseline justify-between mb-6 lg:mb-8 gap-2">
                <h2 className="text-3xl lg:text-4xl font-black uppercase text-white tracking-tighter m-0">
                    Daily Streak
                </h2>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Status:</span>
                    <span className="text-lg lg:text-xl font-mono font-bold text-[#e2ff3d]">
                        {displayStep === 0 ? 'START CYCLE' : `${displayStep} / 7 DAYS`}
                    </span>
                </div>
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

            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
                <p className="text-[9px] lg:text-[10px] text-gray-400 font-mono uppercase opacity-60">
                    Consecutive Activity Required for Bonus
                </p>
                <p className="text-[9px] lg:text-[10px] text-[#e2ff3d] font-mono uppercase tracking-widest font-bold">
                    +1000 BONUS ON DAY 7
                </p>

            </div>
        </div>
    );
}
