'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { History, ExternalLink, Activity, ArrowRight, Loader2, Database, Zap, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER!;

interface HistoryItem {
    id: number;
    address: string;
    tx_hash: string;
    event_type: string;
    contract_type: string;
    amount: string;
    harvested_yield: string;
    created_at: string;
}

export function StakingHistory({ type, refreshTrigger = 0 }: { type: 'ZUG' | 'vZUG', refreshTrigger?: number }) {
    const { address } = useAccount();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const fetchHistory = async (showLoading = false) => {
        if (!address) return;
        if (showLoading) setLoading(true);
        try {
            const endpoint = `/api/staking/history?address=${address}&type=${type}&_t=${performance.now()}_${Math.random()}${filter !== 'ALL' ? `&filter=${filter}` : ''}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (Array.isArray(data)) {
                setHistory(data);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        if (!address) return;
        fetchHistory(refreshTrigger > 0);
        const interval = setInterval(() => fetchHistory(false), 15000);
        return () => clearInterval(interval);
    }, [address, type, filter, refreshTrigger]);

    if (!address) return null;

    const tabs = [
        { id: 'ALL', label: 'All' },
        { id: 'STAKED', label: 'Deposits' },
        { id: 'COMPOUNDED', label: 'Compounds' },
        { id: 'REWARD_CLAIMED', label: 'Claims' },
        { id: 'UNSTAKE_REQUESTED,WITHDRAWN', label: 'Exits' }
    ];

    return (
        <div className="mt-8 mb-16 animate-in fade-in duration-700 space-y-4">

            {/* Minimal Header Section */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]"></span>
                    </span>
                    <h2 className="text-sm font-bold text-white/90 tracking-wide uppercase">
                        {type} Ledger
                    </h2>
                </div>

                {/* Stats Pill */}
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                    SYNCED • {history.length} ENTRIES
                </span>
            </div>

            {/* Filter Tabs - Ultra Minimal */}
            <div className="flex flex-wrap gap-1 px-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${filter === tab.id
                                ? 'bg-white/10 text-white border-white/10'
                                : 'bg-transparent text-white/30 border-transparent hover:text-white/60'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content Card - Darker, More Professional */}
            <div className="bg-[#050505]/50 backdrop-blur-md border border-white/5 rounded-[16px] overflow-hidden min-h-[300px]">
                <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                    {loading && history.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-4 text-white/20">
                            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] animate-pulse">Fetching records...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-24 text-center flex flex-col items-center justify-center opacity-30">
                            <Database className="w-8 h-8 text-white/20 mb-4" />
                            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">No records found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.03]">
                            {history.map((item) => (
                                <div key={item.id} className="group hover:bg-white/[0.02] transition-colors px-6 py-3.5 flex items-center justify-between gap-4">

                                    {/* Left: Type & Time */}
                                    <div className="flex items-center gap-4">
                                        {/* Status Indicator Dot */}
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.event_type === 'STAKED' ? 'bg-[#e2ff3d]' :
                                                item.event_type === 'COMPOUNDED' ? 'bg-blue-400' :
                                                    item.event_type === 'WITHDRAWN' ? 'bg-red-400' :
                                                        'bg-white/20'
                                            }`} />

                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-white/80">
                                                    {item.event_type === 'UNSTAKE_REQUESTED' ? 'UNBONDING STARTED' : item.event_type.replace('_', ' ')}
                                                </h4>
                                                <span className="text-[9px] font-mono text-white/20 uppercase hidden sm:inline-block">
                                                    {(() => {
                                                        if (!isMounted) return '...';
                                                        return new Date(item.created_at).toLocaleString('en-GB', {
                                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                        });
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Amount & Link */}
                                    <div className="flex items-center gap-6 text-right">
                                        <div>
                                            {Number(item.amount) > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-[12px] font-mono font-medium tracking-tight ${item.event_type === 'WITHDRAWN' ? 'text-white/50' : 'text-white/90'
                                                        }`}>
                                                        {item.event_type === 'WITHDRAWN' ? '-' : '+'}{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] text-white/20 ml-0.5">{type}</span>
                                                    </span>
                                                    {item.event_type === 'UNSTAKE_REQUESTED' && Number(item.harvested_yield) > 0 && (
                                                        <span className="text-[9px] font-mono text-[#e2ff3d]/60">
                                                            +{Number(item.harvested_yield).toLocaleString(undefined, { maximumFractionDigits: 2 })} Yield
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest">System</span>
                                            )}
                                        </div>

                                        <a
                                            href={`${EXPLORER}/tx/${item.tx_hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-white/10 hover:text-white transition-colors"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Summary */}
            <div className="flex justify-center pt-2">
                <p className="text-[8px] font-mono text-white/10 uppercase tracking-[0.2em]">
                    End of Ledger
                </p>
            </div>
        </div>
    );
}
