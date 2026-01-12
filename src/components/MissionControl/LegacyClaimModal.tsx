
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LegacyClaimModalProps {
    isOpen: boolean;
    points: number;
    onClose: () => void;
}

export function LegacyClaimModal({ isOpen, points, onClose }: LegacyClaimModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center isolate">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative w-full max-w-lg mx-4"
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-[#e2ff3d] blur-[100px] opacity-20 pointer-events-none" />

                        <div className="relative bg-zinc-950 border border-[#e2ff3d]/30 overflow-hidden shadow-2xl">
                            {/* Decorative Lines */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#e2ff3d]" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#e2ff3d]" />

                            <div className="p-8 lg:p-12 text-center space-y-8">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 rounded-full mb-4">
                                        <div className="w-1.5 h-1.5 bg-[#e2ff3d] rounded-full animate-pulse" />
                                        <span className="text-[10px] font-mono font-bold text-[#e2ff3d] uppercase tracking-widest">
                                            Legacy Migration Complete
                                        </span>
                                    </div>

                                    <h2 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                                        Identity<br />
                                        <span className="text-[#e2ff3d]">Verified.</span>
                                    </h2>
                                </div>

                                <div className="py-6 border-y border-white/5 bg-white/[0.02]">
                                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Total Points Claimed</p>
                                    <div className="text-6xl font-black text-white tabular-nums tracking-tighter">
                                        +{points.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-zinc-500 font-mono mt-2">Added to your global XP balance</p>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-full bg-[#e2ff3d] hover:bg-white text-black font-black uppercase tracking-[0.2em] py-4 transition-colors text-xs"
                                >
                                    [ Acknowledge ]
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
