'use client'

import { motion, AnimatePresence } from 'framer-motion';
import { useConnect, useAccount, type Connector } from 'wagmi';
import { FaTimes, FaShieldAlt } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface WalletModalProps {
    open: boolean;
    onClose: () => void;
}

export default function WalletModal({ open, onClose }: WalletModalProps) {
    const { connect, connectors, isPending } = useConnect();
    const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);

    const filteredConnectors = connectors.filter((connector: Connector) =>
        connector.name !== 'Mock Connector' &&
        (connector.name === 'WalletConnect' || connector.name === 'MetaMask')
    );

    useEffect(() => {
        if (isConnected && address && open) {
            onClose();
        }
    }, [isConnected, address, open, onClose]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (open) {
            const original = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = original; };
        }
    }, [open, mounted]);

    const handleSelect = async (connector: Connector) => {
        try {
            await connect({ connector });
        } catch (err) {
            console.error(err);
        }
    };

    if (!mounted) return null;

    const modalRoot = typeof document !== 'undefined' ? document.body : null;
    if (!modalRoot) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={onClose} />

                    <motion.div
                        initial={{ scale: 0.98, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, y: 10 }}
                        className="relative z-10 w-full max-w-sm overflow-hidden bg-[#020202] inst-border rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Background Atmosphere */}
                        <div className="absolute inset-0 blueprint-grid-fine opacity-20 pointer-events-none" />
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d]/20 to-transparent" />

                        <div className="relative z-10 p-10">
                            <button
                                className="absolute top-6 right-6 text-gray-700 hover:text-white transition-all duration-300 group"
                                onClick={onClose}
                            >
                                <FaTimes className="w-3.5 h-3.5 group-hover:scale-110" />
                            </button>

                            <div className="text-left mb-12">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5 mb-8">
                                    <FaShieldAlt className="text-[#e2ff3d] w-2.5 h-2.5" />
                                    <span className="text-[8px] font-mono font-bold tracking-[0.3em] text-[#e2ff3d] uppercase">SECURED_LINK_v2.0</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white tracking-tighter mb-4 uppercase">
                                    AUTHENTICATE_WALLET
                                </h2>
                                <p className="text-gray-500 font-mono text-[9px] tracking-[0.05em] leading-relaxed max-w-[260px] uppercase">
                                    Initialize secure cryptographic handshake to authorize high-fidelity protocol access.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                {filteredConnectors.map((connector: Connector) => (
                                    <button
                                        key={connector.id}
                                        onClick={() => handleSelect(connector)}
                                        disabled={isPending}
                                        className="group relative w-full flex items-center justify-between px-6 py-5 bg-white/[0.01] border border-white/5 hover:border-[#e2ff3d]/30 hover:bg-[#e2ff3d]/5 rounded-sm transition-all duration-300 disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-start leading-none">
                                                <span className="text-[11px] font-bold tracking-[0.2em] text-white uppercase group-hover:text-[#e2ff3d] transition-colors">{connector.name.replace(' ', '_')}</span>
                                                <span className="text-[7px] font-mono text-gray-700 tracking-[0.1em] mt-2 uppercase font-bold">L1_HARDWARE_INTEGRITY</span>
                                            </div>
                                        </div>
                                        {isPending ? (
                                            <div className="w-4 h-4 border border-[#e2ff3d]/20 border-t-[#e2ff3d] rounded-full animate-spin" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 bg-white/5 group-hover:bg-[#e2ff3d] transition-colors shadow-[0_0_10px_rgba(226,255,61,0)] group-hover:shadow-[0_0_10px_rgba(226,255,61,0.5)]" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                                <p className="text-[8px] font-mono text-gray-700 tracking-[0.05em] text-center leading-relaxed max-w-[240px] uppercase">
                                    By initializing connection, you confirm agreement with <span className="text-[#e2ff3d]/60 hover:text-[#e2ff3d] transition-colors cursor-pointer font-bold">ZUG_PROTOCOL_CORE_POLICIES</span>
                                </p>
                                <div className="text-[7px] font-mono text-white/5 uppercase tracking-[0.4em]">ENCRYPTED_TLS_v1.3</div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        modalRoot
    );
}
