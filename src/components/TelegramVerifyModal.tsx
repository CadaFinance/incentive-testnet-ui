import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
                    className="bg-[#0f0f0f] border border-white/10 rounded-lg max-w-md w-full p-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-600 hover:text-white z-10"
                    >
                        ✕
                    </button>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                            <Send className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Telegram Verify</h2>
                        <p className="text-xs text-gray-500 font-mono mt-2">
                            Secure authentication via the Official ZugChain Bot
                        </p>
                    </div>

                    <div className="space-y-6">

                        {(status === 'INIT' || status === 'WAITING') && (
                            <div className="space-y-4">
                                <div className="p-6 bg-white/5 rounded-lg border border-white/10 flex flex-col items-center gap-4 text-center">
                                    {status === 'INIT' ? (
                                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                    ) : (
                                        <>
                                            <a
                                                href={deepLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-4 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold uppercase tracking-widest rounded transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(0,136,204,0.3)] flex items-center justify-center gap-2"
                                            >
                                                Open Telegram App <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <p className="text-[10px] text-gray-500 max-w-[200px]">
                                                Click to open bot, then tap <strong>START</strong> to verify.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {status === 'WAITING' && (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />
                                        <span className="text-[10px] text-gray-600 font-mono uppercase animate-pulse">Waiting for signal...</span>
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
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded text-center space-y-2">
                                    <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto" />
                                    <h3 className="font-bold text-yellow-500">Membership Required</h3>
                                    <p className="text-xs text-yellow-200/80">
                                        Identity confirmed, but you are not in the group.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <a
                                        href="https://t.me/zugchain"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-2"
                                    >
                                        1. Join Group <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <button
                                        onClick={handleRetry}
                                        className="py-3 bg-[#e2ff3d] hover:bg-white text-black text-xs font-bold uppercase rounded flex items-center justify-center gap-2"
                                    >
                                        2. Try Again
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === 'DUPLICATE' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-center">
                                    <p className="text-sm text-red-400 font-bold">Account Already Linked</p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        This Telegram account is already associated with another wallet address.
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 bg-zinc-800 text-white font-bold uppercase rounded"
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
