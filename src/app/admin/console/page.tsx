'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/MissionControl/DashboardLayout';

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

interface Visitor {
    ip: string;
    country: string;
    duration: number;
    isAdmin: boolean;
    wallet: string | null;
}

interface Stats {
    totalOnline: number;
    countries: Record<string, number>;
    visitors: Visitor[];
}

export default function AdminConsole() {
    const { address, isConnected } = useAccount();
    const [stats, setStats] = useState<Stats | null>(null);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!isConnected || !address || address.toLowerCase() !== ADMIN_ADDRESS) return;

        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            ws.current = new WebSocket(`${protocol}//${host}/ws`);

            ws.current.onopen = () => {
                console.log('Admin Console Connected');
                ws.current?.send(JSON.stringify({
                    type: 'AUTH_ADMIN',
                    walletAddress: address
                }));
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'STATS_UPDATE') {
                        setStats(data);
                    }
                } catch (e) { }
            };

            ws.current.onclose = () => {
                setTimeout(connect, 3000);
            };
        };

        connect();
        return () => ws.current?.close();
    }, [address, isConnected]);

    if (!isConnected || address?.toLowerCase() !== ADMIN_ADDRESS) {
        return (
            <div className="flex items-center justify-center min-h-screen font-mono text-red-500">
                ACCESS_DENIED: ADMINISTRATIVE_PRIVILEGES_REQUIRED
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto font-mono p-6 space-y-8">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                    <h1 className="text-2xl font-bold tracking-tighter">PRIVATE_MONITOR_v1</h1>
                    <div className="flex gap-4 items-center">
                        <span className="text-[10px] text-zinc-500">SESSION_STATUS:</span>
                        <span className="text-green-500 animate-pulse text-xs font-bold uppercase">● LIVE_STREAMING</span>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-lg">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Total Online</div>
                        <div className="text-4xl font-bold text-white">{stats?.totalOnline || 0}</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-lg">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Active Regions</div>
                        <div className="text-4xl font-bold text-blue-500">{Object.keys(stats?.countries || {}).length}</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-lg">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Admin Active</div>
                        <div className="text-4xl font-bold text-green-500">TRUE</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* VISITOR LIST */}
                    <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                        <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 font-bold text-xs uppercase text-zinc-400">
                            Live Visitor Pool (Zero Storage)
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                                <thead className="text-zinc-500 border-b border-zinc-800 bg-black/50">
                                    <tr>
                                        <th className="p-4">COUNTRY</th>
                                        <th className="p-4">IP ADDRESS</th>
                                        <th className="p-4">DURATION</th>
                                        <th className="p-4">MODES</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {stats?.visitors.map((v, i) => (
                                        <tr key={i} className="hover:bg-zinc-900/40 transition-colors">
                                            <td className="p-4 flex items-center gap-2">
                                                {getFlagEmoji(v.country)} {v.country}
                                            </td>
                                            <td className="p-4 font-bold text-zinc-300">
                                                {v.ip}
                                            </td>
                                            <td className="p-4 text-blue-400 font-bold">
                                                {formatDuration(v.duration)}
                                            </td>
                                            <td className="p-4">
                                                {v.isAdmin ? (
                                                    <span className="bg-blue-900/20 text-blue-500 px-2 py-0.5 rounded border border-blue-900/30 text-[9px] font-bold">ADMIN_EYE</span>
                                                ) : (
                                                    <span className="text-zinc-600 bg-zinc-900/50 px-2 py-0.5 rounded text-[9px]">VISITOR</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!stats?.visitors || stats.visitors.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="p-10 text-center text-zinc-600 italic">EMPTY_POOL: WAITING_FOR_CONNECTIONS</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* REGIONAL BREAKDOWN */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                        <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 font-bold text-xs uppercase text-zinc-400">
                            Regional Clusters
                        </div>
                        <div className="p-4 space-y-4">
                            {Object.entries(stats?.countries || {}).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
                                <div key={code} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{getFlagEmoji(code)}</span>
                                        <span className="font-bold text-zinc-300">{code === 'XX' ? 'Unknown' : code}</span>
                                    </div>
                                    <div className="bg-zinc-800 px-3 py-1 rounded-full font-bold text-blue-400">
                                        {count}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function formatDuration(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
}

function getFlagEmoji(countryCode: string) {
    if (!countryCode || countryCode === 'XX') return '🌍';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
