
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Twitter, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface TweetVerifyModalProps {
    open: boolean;
    onClose: () => void;
    walletAddress: string;
    referralCode?: string;
    onVerified: () => void;
}

export function TweetVerifyModal({ open, onClose, walletAddress, referralCode, onVerified }: TweetVerifyModalProps) {
    const [link, setLink] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const TWEET_TEXT = `Started my journey on the @ZugChain_org Incentive Testnet! 🚀\n\nEarning points, securing the network, and claiming my place in the genesis. Don't miss the early access phase.\n\nGet started here 👇\nhttps://testnet.zugchain.org/?ref=${referralCode || 'early'}\n\n#ZugChain $ZUG #ZUG`;

    const INTENT_URL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`;

    const handleVerify = async () => {
        if (!link) {
            setError('Please paste your tweet link first.');
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const res = await fetch('/api/missions/verify-tweet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: walletAddress, tweetUrl: link })
            });

            const data = await res.json();

            if (data.success) {
                toast.success('Mission Complete! +1000 Points');
                onVerified(); // Trigger data refresh
                onClose();
            } else {
                setError(data.message || 'Verification failed');
            }
        } catch (e) {
            setError('Server connection failed. Try again.');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-[#09090b] border border-[#e2ff3d]/20 shadow-[0_0_50px_rgba(226,255,61,0.1)] p-6 md:p-8"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col gap-6">
                            {/* Header */}
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-12 h-12 bg-[#e2ff3d]/10 flex items-center justify-center rounded-full mb-4">
                                    <Twitter className="w-6 h-6 text-[#e2ff3d]" />
                                </div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                    Verify Mission
                                </h2>
                                <p className="text-zinc-500 text-xs font-mono">
                                    Paste the link to your tweet to claim rewards.
                                </p>
                            </div>

                            {/* Verification Input */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-[#e2ff3d] uppercase tracking-widest pl-1">
                                        Tweet Link (Status URL)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="https://x.com/username/status/123..."
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-white/10 text-white p-3 text-sm focus:border-[#e2ff3d]/50 focus:outline-none font-mono placeholder:text-zinc-700"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 text-red-500 bg-red-500/5 p-3 text-xs border border-red-500/20">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    onClick={handleVerify}
                                    disabled={verifying}
                                    className="w-full bg-[#e2ff3d] hover:bg-white text-black font-black uppercase py-4 tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                >
                                    {verifying ? (
                                        <span className="animate-pulse">Verifying...</span>
                                    ) : (
                                        <>
                                            [ VERIFY & CLAIM ]
                                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="relative h-px bg-white/5 my-2">
                                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#09090b] px-2 text-[10px] text-zinc-600 font-mono">
                                    OR
                                </span>
                            </div>

                            {/* Tweet Again Button */}
                            <a
                                href={INTENT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors font-mono uppercase tracking-wide border border-white/5 hover:border-white/20 py-3 bg-zinc-900/30"
                            >
                                <Twitter className="w-3 h-3" />
                                Post Again
                            </a>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
