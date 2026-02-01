"use client";

import { useEffect, useState, useRef } from 'react';
import { Activity, Clock, Zap } from 'lucide-react';

export function RpcDebugTracker() {
    const [stats, setStats] = useState({
        last1s: 0,
        last5s: 0,
        last15s: 0,
        last30s: 0,
        last60s: 0,
        total: 0,
        peak1s: 0,
        peak5s: 0
    });

    const [remainingSeconds, setRemainingSeconds] = useState(60);
    const [isFinished, setIsFinished] = useState(false);

    // Store timestamps of all requests
    const timestamps = useRef<number[]>([]);
    const startTime = useRef<number>(Date.now());

    useEffect(() => {
        const handleRpcRequest = (event: Event) => {
            // Only count if not finished (first 60 seconds)
            if (isFinished) return;

            const customEvent = event as CustomEvent;
            timestamps.current.push(customEvent.detail.timestamp || Date.now());
        };

        window.addEventListener('rpc-request', handleRpcRequest);

        // Start interval to update UI
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime.current) / 1000);
            const remaining = Math.max(0, 60 - elapsed);

            setRemainingSeconds(remaining);
            if (remaining === 0 && !isFinished) {
                setIsFinished(true);
            }

            // Calculate rolling window counts
            const ts = timestamps.current;
            const last1s = ts.filter(t => now - t <= 1000).length;
            const last5s = ts.filter(t => now - t <= 5000).length;
            const last15s = ts.filter(t => now - t <= 15000).length;
            const last30s = ts.filter(t => now - t <= 30000).length;
            const last60s = ts.filter(t => now - t <= 60000).length;

            setStats(prev => ({
                last1s,
                last5s,
                last15s,
                last30s,
                last60s,
                total: ts.length,
                // Peak captures the highest value seen during the active window
                peak1s: remaining > 0 ? Math.max(prev.peak1s, last1s) : prev.peak1s,
                peak5s: remaining > 0 ? Math.max(prev.peak5s, last5s) : prev.peak5s
            }));
        }, 500);

        return () => {
            window.removeEventListener('rpc-request', handleRpcRequest);
            clearInterval(interval);
        };
    }, [isFinished]);

    // Color helpers based on thresholds
    const getColor = (val: number, limit: number) => {
        if (val > limit) return "text-red-500 animate-pulse font-black";
        if (val > limit * 0.8) return "text-yellow-400 font-bold";
        return "text-[#e2ff3d]";
    };

    return (
        <div className={`fixed bottom-4 right-4 z-[9999] bg-black/95 border ${isFinished ? 'border-[#e2ff3d]/50' : 'border-white/20'} p-4 rounded-md shadow-2xl font-mono text-[10px] w-72 backdrop-blur-md transition-all`}>
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <span className="font-bold text-white flex items-center gap-2">
                    <Activity className={`w-3 h-3 ${isFinished ? 'text-[#e2ff3d]' : 'text-blue-400 animate-pulse'}`} />
                    {isFinished ? 'SNAPSHOT_COMPLETED' : 'ANALYZING_INITIAL_LOAD'}
                </span>
                <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded text-[8px]">
                    <Clock className="w-2 h-2" />
                    <span className={remainingSeconds < 10 ? "text-red-500 font-bold" : "text-gray-400"}>
                        {remainingSeconds}s
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {/* Current Metrics */}
                <div className="flex justify-between items-center opacity-60">
                    <span className="text-gray-400">CURRENT_01s</span>
                    <span className={`text-sm ${getColor(stats.last1s, 50)}`}>{stats.last1s}</span>
                </div>

                {/* PEAK METRICS - Highlights highest load */}
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-sm border border-white/5 shadow-inner">
                    <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-[#e2ff3d]" />
                        <span className="text-white font-black text-[9px] uppercase">Peak_1s_Load</span>
                    </div>
                    <span className={`text-sm font-black ${getColor(stats.peak1s, 50)} underline`}>
                        {stats.peak1s} req
                    </span>
                </div>

                <div className="flex justify-between items-center bg-white/5 p-2 rounded-sm border border-white/5">
                    <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-[#e2ff3d]" />
                        <span className="text-white font-black text-[9px] uppercase">Peak_5s_Load</span>
                    </div>
                    <span className={`text-sm font-black ${getColor(stats.peak5s, 250)}`}>
                        {stats.peak5s} req
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="p-2 border border-white/5 bg-white/[0.02]">
                        <span className="text-[7px] text-gray-500 block uppercase">Total_60s</span>
                        <span className="text-xs font-bold text-white tabular-nums">{stats.total} req</span>
                    </div>
                    <div className="p-2 border border-white/5 bg-white/[0.02]">
                        <span className="text-[7px] text-gray-500 block uppercase">Avg_Rate</span>
                        <span className="text-xs font-bold text-[#e2ff3d] tabular-nums">
                            {(stats.total / (60 - remainingSeconds + 0.1)).toFixed(1)} r/s
                        </span>
                    </div>
                </div>
            </div>

            {isFinished && (
                <div className="mt-4 p-2 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 text-[8px] text-[#e2ff3d] font-bold uppercase text-center animate-in fade-in zoom-in duration-500">
                    Measurement Complete. Refresh to Reset.
                </div>
            )}
        </div>
    );
}
