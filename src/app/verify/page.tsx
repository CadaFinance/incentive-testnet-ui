"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Script from 'next/script';
import { ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VerifyPage() {
    const [step, setStep] = useState<1 | 2 | 4>(1); // 1: Turnstile, 2: Error, 4: Success
    const [isVerifying, setIsVerifying] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Turnstile Callback
    const handleTurnstileSuccess = (token: string) => {
        handleVerifyParams(token);
    };

    const handleVerifyParams = async (token: string) => {
        setIsVerifying(true);
        try {
            const res = await fetch('/api/unban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ turnstileToken: token })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Verification Failed');

            setStep(4);
            toast.success('Security Clearance Granted');

            setTimeout(() => {
                window.location.href = '/';
            }, 15000); // 15 seconds to allow sync worker to update Nginx

        } catch (error: any) {
            const msg = error.message || 'Verification Failed';
            setErrorMessage(msg);
            setIsVerifying(false);
            setStep(2); // Show error state, no auto-reload
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0b0d] text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-[#e2ff3d] selection:text-black">
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="lazyOnload"
            />

            {/* Subtle Ambient Background - Matching Vault V4 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#e2ff3d]/[0.05] blur-[150px] rounded-full pointer-events-none" />

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-md w-full bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl relative z-10"
            >
                {/* Header Section - Matching "Stake vZUG" Card Header */}
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-bold tracking-wide text-white flex items-center gap-2 uppercase">
                        <ShieldCheck className="w-3 h-3 text-[#e2ff3d]" /> Security Gateway
                    </h3>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Action Required</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-8">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Access Suspended</h2>
                                    <p className="text-sm font-medium text-white/50 leading-relaxed">
                                        Your connection has been flagged for unusual activity. Please complete the security verification below to restore access to the ZugChain Network.
                                    </p>
                                </div>

                                {/* Turnstile Container - Matching Input Field Style */}
                                <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 transition-colors hover:border-white/20">
                                    {isVerifying ? (
                                        <div className="flex flex-col items-center gap-3 py-2">
                                            <Loader2 className="w-6 h-6 text-[#e2ff3d] animate-spin" />
                                            <span className="text-[10px] font-bold text-[#e2ff3d] uppercase tracking-widest">Verifying...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} data-theme="dark" data-callback="onTurnstileSuccess"></div>
                                            <p className="text-[9px] text-white/20 font-mono uppercase tracking-widest text-center">
                                                Protected by Cloudflare Turnstile
                                            </p>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-6"
                            >
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mx-auto mb-6">
                                    <AlertTriangle className="w-8 h-8 text-red-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Verification Failed</h2>
                                <p className="text-sm text-red-400 mb-6">{errorMessage}</p>

                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors"
                                >
                                    Return to Dashboard
                                </button>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-6"
                            >
                                <div className="w-16 h-16 bg-[#e2ff3d]/10 rounded-full flex items-center justify-center border border-[#e2ff3d]/20 mx-auto mb-6">
                                    <CheckCircle2 className="w-8 h-8 text-[#e2ff3d]" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Clearance Granted</h2>
                                <p className="text-xs text-white/50 mb-2">Synchronizing with security nodes...</p>
                                <p className="text-[10px] font-mono text-[#e2ff3d] mb-6 uppercase tracking-widest">Redirecting in 15 seconds</p>

                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-[#e2ff3d]"
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 15, ease: "linear" }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </motion.div>

            {/* Footer / System Status */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-50">
                <div className="flex items-center gap-6 text-[9px] font-mono uppercase tracking-widest text-white/40">
                    <span>System: Normal</span>
                    <span>Zone: Public</span>
                    <span>Prot: v4.2</span>
                </div>
            </div>

            {/* Global Listener Helper */}
            <EffectWrapper setTurnstileToken={handleTurnstileSuccess} />
        </div>
    );
}

function EffectWrapper({ setTurnstileToken }: any) {
    useEffect(() => {
        // @ts-ignore
        window.onTurnstileSuccess = (token: string) => {
            setTurnstileToken(token);
        };
    }, []);
    return null;
}
