'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { History, ExternalLink, Terminal, ArrowRight, Loader2, Database, Zap } from 'lucide-react';

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

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [filter, setFilter] = useState('ALL');

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
        // If trigger incremented (>0), show loading to give feedback of "refreshing"
        fetchHistory(refreshTrigger > 0);

        const interval = setInterval(() => fetchHistory(false), 15000);
        return () => clearInterval(interval);
    }, [address, type, filter, refreshTrigger]);

    if (!address) return null;

    const tabs = [
        { id: 'ALL', label: 'ALL' },
        { id: 'STAKED', label: 'DEPOSITS' },
        { id: 'COMPOUNDED', label: 'COMPOUNDS' },
        { id: 'REWARD_CLAIMED', label: 'CLAIMS' },
        { id: 'UNSTAKE_REQUESTED,WITHDRAWN', label: 'EXITS' }
    ];

    return (
        <div className="bg-[#0b0b0b] border border-white/5 shadow-2xl overflow-hidden mt-12 mb-20 animate-in fade-in duration-700">
            <div className="border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-[#e2ff3d]" />
                        <h3 className="text-[10px] font-black tracking-[0.4em] uppercase text-white">
                            {type}_PROTOCOL_LOGS
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#e2ff3d] animate-pulse" />
                        <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest">Live_Telemetry</span>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-t border-white/5">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`flex-1 py-3 text-[8px] font-black tracking-[0.2em] uppercase transition-all border-b-2 ${filter === tab.id
                                ? 'bg-[#e2ff3d]/10 text-[#e2ff3d] border-[#e2ff3d]'
                                : 'text-gray-600 border-transparent hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-0 min-h-[120px] max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                {loading && history.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 font-mono text-[9px] uppercase animate-pulse flex flex-col items-center gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-[#e2ff3d]" />
                        Synchronizing with neural net...
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center opacity-30">
                        <Database className="w-8 h-8 text-gray-800 mb-4" />
                        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-600">No active signals detected for this node</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.02]">
                        {history.map((item) => (
                            <div key={item.id} className="px-6 py-4 hover:bg-[#e2ff3d]/[0.02] transition-all group flex items-center justify-between border-l-2 border-transparent hover:border-l-[#e2ff3d]">
                                <div className="flex items-center gap-6">
                                    <div className={`p-2 rounded-full hidden sm:block ${item.event_type === 'STAKED' ? 'bg-[#e2ff3d]/10 text-[#e2ff3d]' :
                                        item.event_type === 'COMPOUNDED' ? 'bg-blue-500/10 text-blue-400' :
                                            item.event_type === 'WITHDRAWN' ? 'bg-red-500/10 text-red-500' :
                                                'bg-purple-500/10 text-purple-400'
                                        }`}>
                                        <Zap className="w-3.5 h-3.5" />
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono text-gray-600 font-bold group-hover:text-gray-400 transition-colors">
                                                [{(() => {
                                                    if (!isMounted) return 'Loading...';
                                                    // Backend now returns guaranteed ISO UTC string (ending in Z)
                                                    const dateStr = item.created_at;
                                                    return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')
                                                })()}]
                                            </span>
                                            <span className={`text-[11px] font-black tracking-[0.1em] uppercase ${item.event_type === 'STAKED' ? 'text-[#e2ff3d]' :
                                                item.event_type === 'COMPOUNDED' ? 'text-blue-400' :
                                                    item.event_type === 'REWARD_CLAIMED' ? 'text-[#e2ff3d]' :
                                                        item.event_type === 'WITHDRAWN' ? 'text-red-500' :
                                                            item.event_type === 'UNSTAKE_REQUESTED' ? 'text-orange-400' :
                                                                'text-gray-400'
                                                }`}>
                                                {item.event_type === 'UNSTAKE_REQUESTED' ? 'UNBONDING_STARTED' : item.event_type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 line-clamp-1">
                                            <span className="text-[14px] font-black text-white tabular-nums tracking-tighter">
                                                {Number(item.amount) > 0 ? (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1">
                                                            {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                                            <span className="text-[10px] text-gray-600 font-black uppercase text-[7px]">{type}</span>
                                                        </div>
                                                        {item.event_type === 'UNSTAKE_REQUESTED' && Number(item.harvested_yield) > 0 && (
                                                            <div className="text-[9px] text-[#e2ff3d] font-bold opacity-80 flex items-center gap-1">
                                                                (+ {Number(item.harvested_yield).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} YIELD)
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-700 text-[10px] font-mono uppercase tracking-widest opacity-40">System_Event</span>
                                                )}
                                            </span>
                                            <ArrowRight className="w-2.5 h-2.5 text-gray-800" />
                                            <span className={`text-[8px] font-mono font-bold uppercase tracking-widest opacity-60 ${item.event_type === 'STAKED' ? 'text-[#e2ff3d]' :
                                                item.event_type === 'COMPOUNDED' ? 'text-blue-400' :
                                                    item.event_type === 'WITHDRAWN' ? 'text-red-500' : 'text-gray-500'
                                                }`}>
                                                {item.event_type === 'STAKED' ? 'Deposited' :
                                                    item.event_type === 'COMPOUNDED' ? 'Compound Success' :
                                                        item.event_type === 'REWARD_CLAIMED' ? 'Rewards Claimed' :
                                                            item.event_type === 'WITHDRAWN' ? 'Withdrawn' :
                                                                item.event_type === 'UNSTAKE_REQUESTED' ? 'Unstake Request' : 'Committed'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-mono text-gray-800 group-hover:text-gray-600 transition-colors hidden md:block">
                                        {item.tx_hash.substring(0, 8)}...{item.tx_hash.substring(60)}
                                    </span>
                                    <a
                                        href={`https://explorer.zugchain.org/tx/${item.tx_hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 border border-white/5 hover:border-[#e2ff3d]/50 text-gray-800 hover:text-white hover:bg-[#e2ff3d]/10 transition-all rounded shadow-sm"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex justify-between items-center sm:flex-row flex-col gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest flex items-center gap-2">
                        <History size={10} /> Sync_Stable [OK]
                    </span>
                    <span className="text-[8px] font-mono text-gray-800 uppercase tracking-widest">
                        Cache_Records: {history.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#e2ff3d]/40 w-full animate-progress" />
                    </div>
                </div>
            </div>
        </div>
    );
}
