import React from 'react';
import { Gift, Copy, Check, Share2, Users, Trophy, Activity } from 'lucide-react';
import { toast } from 'sonner';

export const ReferralBanner = ({ code }: { code: string }) => (
    <div className="bg-gradient-to-r from-[#e2ff3d]/10 to-transparent border border-[#e2ff3d]/20 p-4 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e2ff3d]/5 blur-3xl rounded-full -mr-16 -mt-16 animate-pulse" />
        <div className="flex items-center gap-4 relative">
            <div className="p-3 bg-[#e2ff3d] rounded-sm">
                <Gift className="w-5 h-5 text-black" />
            </div>
            <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Referral Bonus Locked In</h3>
                <p className="text-[9px] text-[#e2ff3d]/70 font-mono mt-1 uppercase">Complete faucet claim to unlock +50 points welcome bonus.</p>
            </div>
            <div className="ml-auto px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-mono text-gray-500 uppercase">
                REF: {code}
            </div>
        </div>
    </div>
);

export const ReferralCodeCard = ({ code, link }: { code: string, link: string }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success("Link Copied to Clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-[#0b0b0b] border border-white/5 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-white flex items-center gap-2">
                    <Share2 className="w-3 h-3 text-[#e2ff3d]" /> YOUR_INVITE_LINK
                </h3>
                <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-[#e2ff3d] rounded-full animate-ping" />
                    <span className="text-[8px] font-mono text-[#e2ff3d]">ACTIVE</span>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative group overflow-hidden">
                    <input
                        readOnly
                        value={link}
                        className="w-full bg-white/[0.02] border border-white/10 py-4 px-4 pr-14 text-[9px] sm:text-[10px] font-mono text-white outline-none transition-all group-hover:border-white/20 truncate"
                    />
                    <button
                        onClick={handleCopy}
                        className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-2 bg-[#e2ff3d] text-black hover:bg-white transition-all shadow-lg scale-90 sm:scale-100"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                </div>
                <div className="flex justify-between items-center px-1 gap-2">
                    <div className="text-left">
                        <span className="text-[7px] text-gray-600 uppercase font-bold tracking-widest block">Invite_Code</span>
                        <span className="text-[11px] sm:text-[12px] text-white font-black font-mono tracking-tighter">{code}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[7px] text-[#e2ff3d]/60 uppercase font-bold tracking-widest block">Rewards</span>
                        <span className="text-[11px] sm:text-[12px] text-[#e2ff3d] font-black font-mono tracking-tighter font-mono italic">600 PTS</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ReferralStatsGrid = ({ stats }: { stats: any }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
            { label: 'Total_Invited', value: stats.total_referrals, icon: <Users size={12} />, color: 'text-white' },
            { label: 'Registrations', value: stats.registrations, icon: <Activity size={12} />, color: 'text-[#e2ff3d]' },
            { label: 'Active_Stakers', value: stats.active_stakers, icon: <Trophy size={12} />, color: 'text-cyan-400' },
            { label: 'Total_Earned', value: `${stats.points_earned} PTS`, icon: <Gift size={12} />, color: 'text-black', bg: 'bg-[#e2ff3d]' }
        ].map((item, idx) => (
            <div key={idx} className={`${item.bg || 'bg-white/[0.02] border-white/5'} border p-3 sm:p-4 space-y-2`}>
                <div className={`flex items-center gap-2 ${item.bg ? 'text-black/60' : 'text-gray-600'}`}>
                    {item.icon}
                    <span className="text-[7px] font-black uppercase tracking-widest truncate">{item.label}</span>
                </div>
                <div className={`text-xl sm:text-2xl font-black ${item.color} tracking-tighter font-mono`}>{item.value}</div>
            </div>
        ))}
    </div>
);
