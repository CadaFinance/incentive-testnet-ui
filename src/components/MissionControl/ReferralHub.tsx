'use client';
import { useState } from 'react';
import { toast } from 'sonner';

interface ReferralHubProps {
    referralCode?: string;
    totalReferrals: number;
    totalPoints: number;
    tierData: any; // Passed from parent
}

export function ReferralHub({ referralCode, totalReferrals, totalPoints, tierData }: ReferralHubProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!referralCode) return;
        const link = `https://zugchain.org/?ref=${referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success("Link Copied");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="grid grid-cols-1 gap-8 border border-white/10 p-8 h-full bg-[#0b0b0b]/80 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#e2ff3d]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                    <div>
                        <h3 className="text-2xl font-black uppercase text-white tracking-tight mb-2 flex items-center gap-3">
                            Start Referral Protocol
                        </h3>
                        <p className="text-xs text-gray-500 font-mono leading-relaxed max-w-lg">
                            Institutional Access Program. Distribute your unique frequency code to onboarding candidates.
                            Earn verified commission points for every valid network entry.
                        </p>
                    </div>
                    <div className="w-full md:w-auto">
                        <div
                            onClick={handleCopy}
                            className="group cursor-pointer bg-white/[0.03] border border-white/10 hover:border-[#e2ff3d]/50 p-4 flex items-center justify-between gap-4 transition-all"
                        >
                            <div className="space-y-1">
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Your Uplink</span>
                                <span className="text-sm font-mono text-gray-300 group-hover:text-white transition-colors">
                                    zugchain.org/?ref=<span className="text-[#e2ff3d] font-bold">{referralCode || '...'}</span>
                                </span>
                            </div>
                            <span className="px-3 py-1 bg-[#e2ff3d] text-black text-[9px] font-black uppercase tracking-widest opacity-80 group-hover:opacity-100">
                                {copied ? 'COPIED' : 'COPY'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* New Dashboard Integration */}

            </div>
        </div>
    );
}
