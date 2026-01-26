'use client';
import { useState, useEffect } from 'react';
import { Bug, X, RotateCcw } from 'lucide-react';

export function RequestDebugger() {
    const [count, setCount] = useState(0);
    const [urls, setUrls] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Track the initial session's requests
        const initialRequests = performance.getEntriesByType('resource')
            .filter(r => (r as PerformanceResourceTiming).initiatorType === 'fetch' || (r as PerformanceResourceTiming).initiatorType === 'xmlhttprequest');

        setCount(initialRequests.length);
        setUrls(initialRequests.map(r => r.name));

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.entryType === 'resource' &&
                    ((entry as PerformanceResourceTiming).initiatorType === 'fetch' ||
                        (entry as PerformanceResourceTiming).initiatorType === 'xmlhttprequest')) {

                    setCount(prev => prev + 1);
                    setUrls(prev => [...prev, entry.name]);
                }
            });
        });

        observer.observe({ entryTypes: ['resource'] });
        return () => observer.disconnect();
    }, []);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[10000] flex items-center gap-2 bg-red-600/90 hover:bg-red-600 text-white px-3 py-2 rounded-full shadow-lg backdrop-blur-md transition-all border border-red-400/50 group"
            >
                <Bug size={14} className="group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black font-mono">REQ_LOGS: {count}</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-[10000] w-80 max-h-[500px] bg-zinc-950 border border-red-500/50 rounded-xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2 text-red-500">
                    <Bug size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Request Intelligence</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-zinc-500 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Stats */}
            <div className="p-4 grid grid-cols-2 gap-4 border-b border-white/5">
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="text-[8px] text-zinc-500 uppercase font-bold mb-1">Total Hits</div>
                    <div className="text-xl font-black font-mono text-white">{count}</div>
                </div>
                <div className="flex flex-col justify-center">
                    <button
                        onClick={() => { setCount(0); setUrls([]) }}
                        className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[9px] font-bold py-2 rounded border border-white/5 transition-all"
                    >
                        <RotateCcw size={10} />
                        RESET ANALYTICS
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-red-500/20">
                {urls.length === 0 ? (
                    <div className="text-center py-10 text-zinc-600 text-[10px] font-mono italic">
                        Listening for signals...
                    </div>
                ) : (
                    [...urls].reverse().map((url, i) => (
                        <div
                            key={i}
                            className="bg-zinc-900/50 p-2 rounded border border-white/5 group hover:border-red-500/30 transition-all"
                        >
                            <div className="text-[9px] text-red-400 font-bold mb-1">#{(urls.length - i).toString().padStart(2, '0')}</div>
                            <div className="text-[10px] font-mono break-all text-zinc-300 leading-relaxed">
                                {url.includes('api') ? (
                                    <span className="text-red-400 font-bold">
                                        {url.substring(url.indexOf('/api'))}
                                    </span>
                                ) : (
                                    url.replace(window.location.origin, '') || '/'
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 bg-red-500/5 border-t border-red-500/10 text-center">
                <span className="text-[8px] text-red-500/50 font-mono tracking-tighter uppercase font-bold">Tracing active on current viewport</span>
            </div>
        </div>
    );
}
