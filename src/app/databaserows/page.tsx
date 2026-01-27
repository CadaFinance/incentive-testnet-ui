'use client';

import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/MissionControl/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Twitter, MessageSquare, Shield, ArrowUpDown, ChevronDown, Check, X, Database, User, Clock, Zap } from 'lucide-react';
import { formatAddress } from '@/lib/utils';
import { toast } from 'sonner';

interface UserRow {
    address: string;
    points: string;
    total_claims: string;
    multiplier: string;
    last_active: string;
    twitter_username: string;
    telegram_id: string;
    discord_username: string;
    total_referrals: string;
}

export default function DatabaseRowsPage() {
    const [data, setData] = useState<UserRow[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [view, setView] = useState<'records' | 'logs'>('records');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<keyof UserRow>('points');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterSocial, setFilterSocial] = useState<'all' | 'verified'>('all');

    const fetchLogs = () => {
        fetch('/api/database/logs')
            .then(res => res.json())
            .then(json => {
                if (json.error) throw new Error(json.error);
                setLogs(json);
            })
            .catch(err => console.error('Log Fetch Error:', err));
    };

    useEffect(() => {
        // Fetch User Records
        fetch('/api/database/users')
            .then(res => res.json())
            .then(json => {
                if (json.error) throw new Error(json.error);
                setData(json);
            })
            .catch(err => toast.error(err.message))
            .finally(() => setLoading(false));

        // Initial Log Fetch
        fetchLogs();

        // Polling for logs every 10 seconds if in logs view
        const interval = setInterval(() => {
            fetchLogs();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const filteredData = useMemo(() => {
        let result = data.filter(row =>
            row.address.toLowerCase().includes(search.toLowerCase()) ||
            row.twitter_username?.toLowerCase().includes(search.toLowerCase()) ||
            row.discord_username?.toLowerCase().includes(search.toLowerCase())
        );

        if (filterSocial === 'verified') {
            result = result.filter(row => row.twitter_username || row.discord_username || row.telegram_id);
        }

        result.sort((a, b) => {
            const valA = parseFloat(a[sortKey]) || a[sortKey];
            const valB = parseFloat(b[sortKey]) || b[sortKey];

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [data, search, sortKey, sortOrder, filterSocial]);

    const handleSort = (key: keyof UserRow) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[#e2ff3d]">
                            <Database className="w-5 h-5" />
                            <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em]">System // Archive_Viewer</span>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                            DATABASE<br /><span className="text-zinc-600 outline-text">RECORDS.</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                        <div className="flex bg-zinc-900/50 p-1 border border-white/10 mb-4 lg:mb-0">
                            <button
                                onClick={() => setView('records')}
                                className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${view === 'records' ? 'bg-[#e2ff3d] text-black shadow-[0_0_15px_rgba(226,255,61,0.3)]' : 'text-zinc-500 hover:text-white'}`}
                            >
                                Records_Live_DB
                            </button>
                            <button
                                onClick={() => { setView('logs'); fetchLogs(); }}
                                className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${view === 'logs' ? 'bg-[#e2ff3d] text-black shadow-[0_0_15px_rgba(226,255,61,0.3)]' : 'text-zinc-500 hover:text-white'}`}
                            >
                                System_Logs
                            </button>
                        </div>
                        <div className="relative flex-1 lg:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search address or social...[ESC to clear]"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/10 py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#e2ff3d]/50 transition-all font-mono"
                            />
                        </div>
                    </div>
                </div>

                {view === 'records' ? (
                    <>
                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Scanned', value: data.length, icon: Database },
                                { label: 'Matches Found', value: filteredData.length, icon: User },
                                { label: 'Avg Multiplier', value: (data.reduce((acc, r) => acc + parseFloat(r.multiplier), 0) / data.length || 0).toFixed(2) + 'x', icon: Zap },
                                { label: 'Last Export', value: '2026-01-25', icon: Clock }
                            ].map((stat, i) => (
                                <div key={i} className="bg-zinc-900/20 border border-white/5 p-4 space-y-1">
                                    <div className="flex items-center gap-2 text-zinc-600">
                                        <stat.icon className="w-3 h-3" />
                                        <span className="text-[8px] font-black uppercase tracking-widest leading-none">{stat.label}</span>
                                    </div>
                                    <div className="text-xl font-black text-white font-mono">{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Table Section */}
                        <div className="relative overflow-x-auto inst-border bg-black/40 backdrop-blur-sm border border-white/5">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-zinc-900/50 border-b border-white/10">
                                        <th className="p-6">
                                            <button onClick={() => handleSort('address')} className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-white transition-colors">
                                                Identity_ID <ArrowUpDown className="w-3 h-3 opacity-30" />
                                            </button>
                                        </th>
                                        <th className="p-6">
                                            <button onClick={() => handleSort('points')} className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-white transition-colors">
                                                Reward_XP <ArrowUpDown className="w-3 h-3 opacity-30" />
                                            </button>
                                        </th>
                                        <th className="p-6">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Verification_Status</span>
                                        </th>
                                        <th className="p-6">
                                            <button onClick={() => handleSort('total_referrals')} className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-white transition-colors">
                                                Network_Size <ArrowUpDown className="w-3 h-3 opacity-30" />
                                            </button>
                                        </th>
                                        <th className="p-6">
                                            <button onClick={() => handleSort('last_active')} className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-white transition-colors">
                                                Last_Pulse <ArrowUpDown className="w-3 h-3 opacity-30" />
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {filteredData.map((user, idx) => (
                                            <motion.tr
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                key={user.address}
                                                className="group hover:bg-[#e2ff3d]/[0.02] border-b border-white/[0.03] transition-colors"
                                            >
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono text-xs text-white group-hover:text-[#e2ff3d] transition-colors">
                                                            {formatAddress(user.address)}
                                                        </span>
                                                        <span className="text-[9px] text-zinc-600 font-mono tracking-tighter truncate max-w-[200px]">
                                                            {user.address}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black text-white tabular-nums">
                                                            {parseInt(user.points).toLocaleString()}
                                                        </span>
                                                        <span className="text-[9px] text-[#e2ff3d] font-bold">
                                                            {(parseFloat(user.multiplier) || 1).toFixed(2)}x MULTIPLIER
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex gap-2">
                                                        {user.twitter_username ? (
                                                            <div className="p-2 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 text-[#e2ff3d] rounded-none group/icon relative">
                                                                <Twitter className="w-3 h-3" />
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[8px] border border-white/10 hidden group-hover/icon:block whitespace-nowrap">@{user.twitter_username}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-zinc-900 border border-white/5 text-zinc-700 rounded-none"><X className="w-3 h-3 opacity-20" /></div>
                                                        )}
                                                        {user.telegram_id ? (
                                                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-none group/icon relative">
                                                                <MessageSquare className="w-3 h-3" />
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[8px] border border-white/10 hidden group-hover/icon:block whitespace-nowrap">ID: {user.telegram_id}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-zinc-900 border border-white/5 text-zinc-700 rounded-none"><X className="w-3 h-3 opacity-20" /></div>
                                                        )}
                                                        {user.discord_username ? (
                                                            <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-none group/icon relative">
                                                                <Shield className="w-3 h-3" />
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[8px] border border-white/10 hidden group-hover/icon:block whitespace-nowrap">{user.discord_username}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-zinc-900 border border-white/5 text-zinc-700 rounded-none"><X className="w-3 h-3 opacity-20" /></div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-black text-zinc-300 font-mono">
                                                            {user.total_referrals || 0}
                                                        </span>
                                                        <div className="h-1 flex-grow max-w-[100px] bg-zinc-900 overflow-hidden">
                                                            <div
                                                                className="h-full bg-zinc-700 transition-all duration-1000"
                                                                style={{ width: `${Math.min(100, (parseInt(user.total_referrals) / 50) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                                                        {user.last_active?.split(' ')[0] || 'NEVER'}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[#e2ff3d] font-mono text-[10px] font-black uppercase tracking-[0.3em]">Live_Event_Feed // Global</h3>
                            <button onClick={fetchLogs} className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold tracking-widest">[ REFRESH_LOGS ]</button>
                        </div>
                        <div className="inst-border bg-[#050505] border border-white/5 font-mono text-[11px] overflow-hidden">
                            <div className="bg-zinc-900/50 p-4 border-b border-white/5 grid grid-cols-12 gap-4 text-zinc-500 font-black uppercase tracking-widest">
                                <div className="col-span-2">Timestamp</div>
                                <div className="col-span-1">Level</div>
                                <div className="col-span-1">Component</div>
                                <div className="col-span-8">Message / Details</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto">
                                {logs.map((log: any) => (
                                    <div key={log.id} className="p-4 border-b border-white/[0.03] grid grid-cols-12 gap-4 hover:bg-white/[0.02] transition-colors items-start">
                                        <div className="col-span-2 text-zinc-600 tabular-nums">
                                            {new Date(log.created_at).toLocaleTimeString()}
                                        </div>
                                        <div className={`col-span-1 font-black ${log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-orange-500' : 'text-blue-500'}`}>
                                            [{log.level}]
                                        </div>
                                        <div className="col-span-1 text-zinc-400">
                                            {log.component}
                                        </div>
                                        <div className="col-span-8 space-y-2">
                                            <div className="text-zinc-200">{log.message}</div>
                                            {log.details && (
                                                <pre className="bg-black/50 p-3 text-[9px] text-zinc-500 overflow-x-auto border border-white/5 max-h-32">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <div className="p-20 text-center text-zinc-700 uppercase tracking-widest">// NO SYSTEM EVENTS RECORDED //</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .outline-text {
                    -webkit-text-stroke: 1px rgba(255,255,255,0.1);
                    text-stroke: 1px rgba(255,255,255,0.1);
                }
                .inst-border {
                    clip-path: polygon(
                        0 10px, 10px 0, 
                        calc(100% - 10px) 0, 100% 10px, 
                        100% calc(100% - 10px), calc(100% - 10px) 100%, 
                        10px 100%, 0 calc(100% - 10px)
                    );
                }
            `}</style>
        </DashboardLayout >
    );
}
