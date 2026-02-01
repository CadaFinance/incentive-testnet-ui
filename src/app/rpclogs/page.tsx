'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/MissionControl/DashboardLayout';
import { RequestLog, BanEntry } from '@/lib/rpc-db';
import { formatDistanceToNow } from 'date-fns';

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

interface Stats {
    activeBans: { total: number; ips: number; wallets: number };
    requestStats: { last5Min: number; currentRate: number; trend: 'up' | 'down' | 'stable' };
    attackPatterns: {
        last24h: number;
        bySeverity: { low: number; medium: number; high: number; critical: number };
    };
    whitelist: { ips: number; wallets: number };
}

export default function RPCSecurityDashboard() {
    const { address, isConnected } = useAccount();
    const [stats, setStats] = useState<Stats | null>(null);
    const [logs, setLogs] = useState<RequestLog[]>([]);
    const [bans, setBans] = useState<BanEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'bans' | 'analysis' | 'permanent'>('overview');
    const [logFilter, setLogFilter] = useState<'all' | 'blocked' | 'post'>('all');

    // Analysis State
    const [topAbusers, setTopAbusers] = useState<any[]>([]);
    const [ipCountries, setIpCountries] = useState<Record<string, string>>({});
    const [permBans, setPermBans] = useState<BanEntry[]>([]);

    // Manual Ban State
    const [manualBanTarget, setManualBanTarget] = useState('');
    const [manualBanReason, setManualBanReason] = useState('');
    const [manualBanType, setManualBanType] = useState<'ip' | 'wallet'>('ip');

    const fetchAllData = useCallback(async () => {
        if (!address) return;
        const headers = { 'x-wallet-address': address };

        try {
            // Fetch Stats
            const statsRes = await fetch('/api/rpc-security/stats', { headers });
            if (statsRes.ok) setStats(await statsRes.json());

            // Fetch Logs with FILTER
            if (activeTab === 'logs') {
                const logsRes = await fetch(`/api/rpc-security/logs?limit=50&status=${logFilter}`, { headers });
                if (logsRes.ok) setLogs(await logsRes.json());
            }

            // Fetch Bans
            const bansRes = await fetch('/api/rpc-security/bans', { headers });
            if (bansRes.ok) setBans(await bansRes.json());

            // Fetch Permanent Bans
            if (activeTab === 'permanent') {
                const permRes = await fetch('/api/rpc-security/permanent-bans', { headers });
                if (permRes.ok) setPermBans(await permRes.json());
            }

            // Fetch Analysis (Top Abusers)
            if (activeTab === 'analysis') {
                const abuserRes = await fetch('/api/rpc-security/top-abusers', { headers });
                if (abuserRes.ok) {
                    const abusers = await abuserRes.json();
                    setTopAbusers(abusers);

                    // Fetch Countries for new IPs
                    abusers.forEach((a: any) => {
                        if (!ipCountries[a.ip_address] && a.ip_address !== '127.0.0.1') {
                            fetch(`http://ip-api.com/json/${a.ip_address}?fields=countryCode`)
                                .then(res => res.json())
                                .then(data => {
                                    setIpCountries(prev => ({ ...prev, [a.ip_address]: data.countryCode }));
                                })
                                .catch(() => { });
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [address, logFilter, activeTab, ipCountries]);

    useEffect(() => {
        if (isConnected && address) {
            fetchAllData();
            const interval = setInterval(fetchAllData, 3000); // 3s refresh
            return () => clearInterval(interval);
        }
    }, [address, isConnected, fetchAllData]);

    const handleAction = async (action: 'ban' | 'unban', type: 'ip' | 'wallet', target: string, reason?: string) => {
        if (!confirm(`Are you sure you want to ${action} ${target}?`)) return;

        try {
            const res = await fetch('/api/rpc-security/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-wallet-address': address || ''
                },
                body: JSON.stringify({ action, type, target, reason })
            });

            if (res.ok) {
                // alert('Action successful'); // Removed for smoother experience
                fetchAllData();
                if (action === 'ban') {
                    setManualBanTarget('');
                    setManualBanReason('');
                }
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (e) {
            alert('Action failed');
        }
    };

    // Access Denied View
    if (!address || address.toLowerCase() !== ADMIN_ADDRESS) {
        return (
            <DashboardLayout>
                <div className="h-[60vh] flex flex-col items-center justify-center bg-black border border-red-500/20 text-center p-8 font-mono">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-3xl font-bold text-red-500 uppercase tracking-widest mb-4">ACCESS DENIED</h1>
                    <p className="text-gray-500">Security Clearance Level: ADMIN</p>
                    <div className="mt-8 p-4 bg-red-500/5 border border-red-500/10 rounded">
                        <p className="text-gray-400 text-xs">Connected Identity: <span className="text-white">{address}</span></p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto font-mono text-sm">
                {/* Header */}
                <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-2xl font-medium text-white tracking-tight">
                            RPC Security
                        </h1>
                        <p className="text-zinc-500 text-xs mt-1">
                            System Status: Operational • {stats?.requestStats.currentRate.toFixed(1) || 0} req/s
                        </p>
                    </div>

                    <div className="flex bg-zinc-900/50 rounded-lg p-1 gap-1">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'analysis', label: 'Analysis' },
                            { id: 'logs', label: 'Logs' },
                            { id: 'bans', label: 'Bans' },
                            { id: 'permanent', label: 'Permanent' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 text-xs transition-colors rounded-md ${activeTab === tab.id
                                    ? 'bg-white text-black font-medium'
                                    : 'text-zinc-500 hover:text-white'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
                        <MinimalCard
                            title="Active Bans"
                            value={stats.activeBans.total}
                            sub={`${stats.activeBans.ips} IPs • ${stats.activeBans.wallets} Wallets`}
                        />
                        <MinimalCard
                            title="Requests (5m)"
                            value={stats.requestStats.last5Min}
                            sub={`${stats.requestStats.currentRate.toFixed(2)} req/s`}
                        />
                        <MinimalCard
                            title="Blocked (24h)"
                            value={stats.attackPatterns.last24h}
                            sub="Total security events"
                        />
                        <MinimalCard
                            title="Whitelist"
                            value={stats.whitelist.ips + stats.whitelist.wallets}
                            sub="Trusted entities"
                        />

                        {/* Quick Manual Ban */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-zinc-900/20 border border-white/5 p-6 mt-4 rounded-lg">
                            <h3 className="text-white text-sm font-medium mb-4">Manual Action</h3>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">Type</label>
                                    <select
                                        value={manualBanType}
                                        onChange={(e) => setManualBanType(e.target.value as 'ip' | 'wallet')}
                                        className="w-full bg-black border border-zinc-800 text-white px-3 py-2.5 text-sm outline-none rounded focus:border-white/30 transition-all"
                                    >
                                        <option value="ip">IP Address</option>
                                        <option value="wallet">Wallet Address</option>
                                    </select>
                                </div>
                                <div className="md:col-span-5 space-y-1">
                                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">Target</label>
                                    <input
                                        type="text"
                                        value={manualBanTarget}
                                        onChange={(e) => setManualBanTarget(e.target.value)}
                                        placeholder={manualBanType === 'ip' ? '192.168.1.1' : '0x...'}
                                        className="w-full bg-black border border-zinc-800 text-white px-3 py-2.5 text-sm outline-none rounded focus:border-white/30 transition-all font-mono"
                                    />
                                </div>
                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">Reason</label>
                                    <input
                                        type="text"
                                        value={manualBanReason}
                                        onChange={(e) => setManualBanReason(e.target.value)}
                                        placeholder="Optional reason..."
                                        className="w-full bg-black border border-zinc-800 text-white px-3 py-2.5 text-sm outline-none rounded focus:border-white/30 transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button
                                        onClick={() => handleAction('ban', manualBanType, manualBanTarget, manualBanReason)}
                                        className="w-full bg-white text-black font-medium px-4 py-2.5 text-sm rounded hover:bg-zinc-200 transition-colors"
                                    >
                                        Ban Target
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ANALYSIS TAB */}
                {activeTab === 'analysis' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="text-white text-sm font-medium">Top Traffic Sources (10m)</h3>
                                <div className="text-xs text-zinc-500">Auto-refreshing</div>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-zinc-900/50 text-xs text-zinc-500">
                                    <tr>
                                        <th className="p-3 font-medium">Rank</th>
                                        <th className="p-3 font-medium">IP Address</th>
                                        <th className="p-3 font-medium">Country</th>
                                        <th className="p-3 font-medium text-right">Total Requests</th>
                                        <th className="p-3 font-medium text-right">Blocked</th>
                                        <th className="p-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900 font-mono text-xs">
                                    {topAbusers.map((item, i) => (
                                        <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="p-3 text-zinc-500 w-12">#{i + 1}</td>
                                            <td className="p-3 text-white font-medium">{item.ip_address}</td>
                                            <td className="p-3 text-zinc-400">
                                                {ipCountries[item.ip_address]
                                                    ? <span className="flex items-center gap-2"><img src={`https://flagcdn.com/16x12/${ipCountries[item.ip_address].toLowerCase()}.png`} width="16" height="12" alt={ipCountries[item.ip_address]} /> {ipCountries[item.ip_address]}</span>
                                                    : <span className="opacity-30">-</span>}
                                            </td>
                                            <td className="p-3 text-right text-white">{item.total_requests}</td>
                                            <td className="p-3 text-right">
                                                {item.blocked_requests > 0 ? <span className="text-red-500">{item.blocked_requests}</span> : <span className="text-zinc-600">0</span>}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => handleAction('ban', 'ip', item.ip_address, 'High traffic volume')}
                                                    className="text-red-500 hover:text-red-400 text-[10px] underline"
                                                >
                                                    BAN
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {topAbusers.length === 0 && (
                                <div className="p-12 text-center text-zinc-600 text-sm">No significant traffic detected</div>
                            )}
                        </div>
                    </div>
                )}

                {/* LOGS TAB */}
                {activeTab === 'logs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Filters */}
                        <div className="flex gap-2 mb-4">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'blocked', label: 'Blocked' },
                                { id: 'post', label: 'Post Reqs' },
                            ].map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setLogFilter(filter.id as any)}
                                    className={`px-3 py-1 text-xs rounded-full border transition-all ${logFilter === filter.id
                                        ? 'bg-white text-black border-white'
                                        : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-black">
                            <table className="w-full text-left">
                                <thead className="bg-zinc-900/50 text-xs text-zinc-500">
                                    <tr>
                                        <th className="p-3 font-medium">Time</th>
                                        <th className="p-3 font-medium">Method</th>
                                        <th className="p-3 font-medium">Status</th>
                                        <th className="p-3 font-medium">Details</th>
                                        <th className="p-3 font-medium text-right">Latency</th>
                                        <th className="p-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900 font-mono text-xs">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors group">
                                            <td className="p-3 text-zinc-500 whitespace-nowrap">
                                                {new Date(log.request_time).toLocaleTimeString()}
                                            </td>
                                            <td className={`p-3 font-medium ${log.method === 'POST' ? 'text-green-500' : 'text-white'}`}>
                                                {log.method}
                                            </td>
                                            <td className="p-3">
                                                <MinimalBadge code={log.status_code} />
                                            </td>
                                            <td className="p-3 text-zinc-400">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-zinc-300">{log.ip_address}</span>
                                                    <span className="text-[10px] text-zinc-600 truncate max-w-[300px]">{log.user_agent}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right text-zinc-500">
                                                {log.response_time_ms}ms
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => handleAction('ban', 'ip', log.ip_address, 'Manual ban from logs')}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 text-[10px] underline"
                                                >
                                                    Ban IP
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {logs.length === 0 && (
                                <div className="p-12 text-center text-zinc-600 text-sm">No logs found</div>
                            )}
                        </div>
                    </div>
                )}

                {/* BANS TAB */}
                {activeTab === 'bans' && (
                    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-black animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {bans.length === 0 ? (
                            <div className="p-12 text-center text-zinc-600 text-sm">No active bans</div>
                        ) : (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-900/50 text-zinc-500">
                                    <tr>
                                        <th className="p-4 font-medium">Type</th>
                                        <th className="p-4 font-medium">Target</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium">Reason</th>
                                        <th className="p-4 font-medium">Time</th>
                                        <th className="p-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900 font-mono">
                                    {bans.map((ban, i) => (
                                        <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="p-4 text-zinc-400 uppercase">
                                                {ban.ban_type}
                                            </td>
                                            <td className="p-4 text-white font-medium">{ban.target}</td>
                                            <td className="p-4">
                                                {ban.ban_status === 'PERMANENT' ? (
                                                    <span className="text-red-500">Permanent</span>
                                                ) : (
                                                    <span className="text-yellow-600">Temporary</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-zinc-500">{ban.reason}</td>
                                            <td className="p-4 text-zinc-500">
                                                {formatDistanceToNow(new Date(ban.banned_at), { addSuffix: true })}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleAction('unban', ban.ban_type, ban.target)}
                                                    className="text-zinc-400 hover:text-white underline transition-colors"
                                                >
                                                    Unban
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* PERMANENT BANS TAB */}
                {activeTab === 'permanent' && (
                    <div className="border border-red-500/20 rounded-lg overflow-hidden bg-black animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-4 border-b border-red-500/20 flex justify-between items-center bg-red-500/5">
                            <h3 className="text-red-400 text-sm font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                PREMANENTLY BANNED
                            </h3>
                            <div className="text-xs text-red-500/50">Recidivist Attackers</div>
                        </div>
                        {permBans.length === 0 ? (
                            <div className="p-12 text-center text-zinc-600 text-sm">No permanent bans recorded</div>
                        ) : (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-900/50 text-zinc-500">
                                    <tr>
                                        <th className="p-4 font-medium">Type</th>
                                        <th className="p-4 font-medium">Target</th>
                                        <th className="p-4 font-medium">Reason</th>
                                        <th className="p-4 font-medium">Banned</th>
                                        <th className="p-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900 font-mono">
                                    {permBans.map((ban, i) => (
                                        <tr key={i} className="hover:bg-red-500/5 transition-colors">
                                            <td className="p-4 text-zinc-400 uppercase">
                                                {ban.ban_type}
                                            </td>
                                            <td className="p-4 text-white font-medium">{ban.target}</td>
                                            <td className="p-4 text-zinc-500">{ban.reason}</td>
                                            <td className="p-4 text-zinc-500">
                                                {formatDistanceToNow(new Date(ban.banned_at), { addSuffix: true })}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleAction('unban', ban.ban_type, ban.target)}
                                                    className="text-red-500 hover:text-red-400 underline transition-colors"
                                                >
                                                    Unban (Emergency)
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

// Minimal Components

function MinimalCard({ title, value, sub }: any) {
    return (
        <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-lg hover:bg-zinc-900/40 transition-colors">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{title}</div>
            <div className="text-3xl font-medium text-white mb-1">{value}</div>
            <div className="text-xs text-zinc-600">{sub}</div>
        </div>
    );
}

function MinimalBadge({ code }: { code: number }) {
    if (code === 200) {
        return <span className="text-zinc-500">200</span>;
    }
    if (code === 429) {
        return <span className="text-yellow-600">429</span>;
    }
    if (code === 403) {
        return <span className="text-red-500 font-medium">403</span>;
    }
    return <span className="text-zinc-500">{code}</span>;
}

