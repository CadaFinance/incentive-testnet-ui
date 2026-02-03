import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM!;

interface TelegramVerifyModalProps {
    open: boolean;
    onClose: () => void;
    walletAddress: string;
    onVerified: () => void;
}

export function TelegramVerifyModal({ open, onClose, walletAddress, onVerified }: TelegramVerifyModalProps) {
    const [status, setStatus] = useState<string>('INIT');
    const [deepLink, setDeepLink] = useState('');
    const pollInterval = useRef<NodeJS.Timeout | null>(null);
    const verifiedRef = useRef(false);

    // Reset when opening
    useEffect(() => {
        if (open) {
            verifiedRef.current = false;
            initializeSession();
        } else {
            // Cleanup
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
            }
            setStatus('INIT');
        }
    }, [open]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, []);

    const initializeSession = async () => {
        try {
            // Clear any existing session first
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
            }

            setStatus('INIT');
            const res = await fetch(`/api/telegram/auth?action=init&address=${walletAddress}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            setDeepLink(data.deepLink);
            setStatus('WAITING');

            // Start Polling
            pollInterval.current = setInterval(() => checkStatus(data.code), 3000);

        } catch (e) {
            console.error(e);
            setStatus('ERROR');
            toast.error("Failed to start verification session");
        }
    };

    const checkStatus = async (code: string) => {
        // Guard: If already verified, stop
        if (verifiedRef.current) return;

        try {
            const res = await fetch(`/api/telegram/auth?action=check&code=${code}`);
            const data = await res.json();

            if (data.status === 'VERIFIED') {
                if (verifiedRef.current) return; // Double Check
                verifiedRef.current = true;

                if (pollInterval.current) clearInterval(pollInterval.current);

                setStatus('VERIFIED');

                toast.success(`Verified as @${data.telegram_username}`, {
                    description: "Identity Confirmed."
                });

                onVerified();

                setTimeout(() => {
                    onClose();
                }, 2000);

            } else if (data.status === 'NOT_MEMBER') {
                setStatus('NOT_MEMBER');
                if (pollInterval.current) clearInterval(pollInterval.current);
            } else if (data.status === 'DUPLICATE') {
                setStatus('DUPLICATE');
                if (pollInterval.current) clearInterval(pollInterval.current);
                toast.error(data.message);
            }
        } catch (e) {
            console.error("Poll Error", e);
        }
    };

    const handleRetry = () => {
        initializeSession();
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#030303]/80 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-50" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10"
                    >
                        ✕
                    </button>

                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl mb-4 shadow-[0_0_20px_rgba(0,136,204,0.1)]">
                            <Send className="w-5 h-5 text-[#0088cc]" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Telegram Verify</h2>
                        <p className="text-xs text-white/40 font-mono mt-2">
                            Secure authentication via the Official ZugChain Bot
                        </p>
                    </div>

                    <div className="space-y-6">

                        {(status === 'INIT' || status === 'WAITING') && (
                            <div className="space-y-4">
                                <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/10 flex flex-col items-center gap-4 text-center">
                                    {status === 'INIT' ? (
                                        <Loader2 className="w-8 h-8 text-[#0088cc] animate-spin" />
                                    ) : (
                                        <>
                                            <a
                                                href={deepLink.replace('https://t.me/', 'tg://resolve?domain=').replace('?start=', '&start=')}
                                                className="w-full py-4 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold uppercase tracking-widest rounded-xl transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(0,136,204,0.3)] flex items-center justify-center gap-2"
                                            >
                                                Open Telegram App <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <p className="text-[10px] text-white/40 max-w-[200px]">
                                                Click to open bot, then tap <strong>START</strong> to verify.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {status === 'WAITING' && (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
                                        <span className="text-[10px] text-white/40 font-mono uppercase animate-pulse">Waiting for signal...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {status === 'VERIFIED' && (
                            <div className="py-8 flex flex-col items-center gap-4 text-green-400 animate-in fade-in zoom-in duration-300">
                                <CheckCircle2 className="w-16 h-16" />
                                <span className="font-bold text-lg">Successfully Verified!</span>
                            </div>
                        )}

                        {status === 'NOT_MEMBER' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center space-y-2">
                                    <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto" />
                                    <h3 className="font-bold text-yellow-500">Membership Required</h3>
                                    <p className="text-xs text-yellow-200/80">
                                        Identity confirmed, but you are not in the group.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <a
                                        href={TELEGRAM}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-4 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/10"
                                    >
                                        1. Join Group <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <button
                                        onClick={handleRetry}
                                        className="py-4 bg-[#e2ff3d] hover:bg-white text-black text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 transition-colors"
                                    >
                                        2. Try Again
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === 'DUPLICATE' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                    <p className="text-sm text-red-400 font-bold">Account Already Linked</p>
                                    <p className="text-xs text-white/40 mt-2">
                                        This Telegram account is already associated with another wallet address.
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold uppercase rounded-xl border border-white/10 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        )}

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
