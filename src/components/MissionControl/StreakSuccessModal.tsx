'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaTimes, FaStar } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface StreakSuccessModalProps {
    open: boolean;
    points: number;
    title?: string;
    onClose: () => void;
}

export default function StreakSuccessModal({ open, points, title = "STREAK MASTER", onClose }: StreakSuccessModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (open) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [open, mounted]);

    if (!mounted) return null;

    const modalRoot = document.body;
    if (!modalRoot) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-[#050505] border border-[#e2ff3d]/30 overflow-hidden shadow-[0_0_50px_rgba(226,255,61,0.2)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-[#e2ff3d]/5" />
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d] to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d]/50 to-transparent" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                        >
                            <FaTimes />
                        </button>

                        <div className="flex flex-col items-center justify-center p-8 text-center bg-scanlines">

                            {/* Animated Icon */}
                            <motion.div
                                initial={{ rotate: -10, scale: 0.8 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                className="mb-6 relative"
                            >
                                <div className="absolute inset-0 bg-[#e2ff3d] blur-2xl opacity-20 rounded-full" />
                                <FaTrophy className="text-6xl text-[#e2ff3d] drop-shadow-[0_0_15px_rgba(226,255,61,0.8)]" />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-2 -right-2 text-white"
                                >
                                    <FaStar className="w-4 h-4 text-white drop-shadow-[0_0_5px_white]" />
                                </motion.div>
                            </motion.div>

                            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-2">
                                {title}
                            </h2>
                            <div className="w-16 h-1 bg-[#e2ff3d] mb-4" />

                            <p className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-6">
                                7-Day Consistency Protocol Achieved
                            </p>

                            <div className="py-2 px-6 bg-[#e2ff3d]/10 border border-[#e2ff3d]/50 rounded mb-6">
                                <span className="text-[#e2ff3d] font-bold text-xl tracking-widest text-glow">
                                    +{points} POINTS
                                </span>
                            </div>



                            <div className="mt-4 text-[9px] text-gray-600 font-mono">
                                // PROTOCOL_LEVEL_UP_DETECTED
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        modalRoot
    );
}
