import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, ExternalLink, Upload, CheckCircle, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface XProfileUpdateModalProps {
    open: boolean;
    onClose: () => void;
    walletAddress: string;
    onVerified: () => void;
}

// Required content for X profile
const PROFILE_NAME = '⚡️ZugChain';
const PROFILE_BIO = 'Building on @ZugChain 🚀';

export function XProfileUpdateModal({ open, onClose, walletAddress, onVerified }: XProfileUpdateModalProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied to clipboard`);
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image must be less than 10MB');
            return;
        }

        // Create local preview (no server upload)
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleVerify = async () => {
        if (!previewUrl) {
            toast.error('Please upload a screenshot first');
            return;
        }

        setVerifying(true);

        // Simulate 5-second verification
        await new Promise(resolve => setTimeout(resolve, 5000));

        try {
            const res = await fetch('/api/missions/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: walletAddress, taskId: -105 })
            });

            const data = await res.json();

            if (data.success) {
                toast.success(`Mission Complete! +${data.points_awarded || 1500} Points`);
                onVerified();
                onClose();
                // Reset state
                setPreviewUrl(null);
            } else {
                toast.error(data.error || 'Verification failed');
            }
        } catch (e) {
            toast.error('Server connection failed. Try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleClose = () => {
        if (!verifying) {
            onClose();
            setPreviewUrl(null);
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
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-[#030303]/80 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 md:p-8 max-h-[90vh] overflow-y-auto rounded-3xl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            disabled={verifying}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col gap-6">
                            {/* Header */}
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl mb-4 shadow-[0_0_20px_rgba(226,255,61,0.1)]">
                                    <svg className="w-5 h-5 text-[#e2ff3d]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                    Update X Profile
                                </h2>
                                <p className="text-white/40 text-xs font-mono">
                                    Add ZugChain to your profile and upload a screenshot
                                </p>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-4">
                                {/* Name Field */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-[#e2ff3d] uppercase tracking-widest pl-1">
                                        Add to Your Name
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white/[0.03] border border-white/10 px-4 py-3 text-white font-mono text-sm rounded-xl">
                                            {PROFILE_NAME}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(PROFILE_NAME, 'Name')}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 transition-colors rounded-xl group"
                                        >
                                            <Copy className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                        </button>
                                    </div>
                                </div>

                                {/* Bio Field */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-[#e2ff3d] uppercase tracking-widest pl-1">
                                        Add to Your Bio
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white/[0.03] border border-white/10 px-4 py-3 text-white font-mono text-sm rounded-xl">
                                            {PROFILE_BIO}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(PROFILE_BIO, 'Bio')}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 transition-colors rounded-xl group"
                                        >
                                            <Copy className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                        </button>
                                    </div>
                                </div>

                                {/* Go to X Settings Button */}
                                <a
                                    href="https://x.com/settings/profile"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 py-3 text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-xl"
                                >
                                    <ExternalLink className="w-4 h-4 opacity-50" />
                                    Open X Profile Settings
                                </a>
                            </div>

                            {/* Divider */}
                            <div className="relative h-px bg-white/5 my-2">
                                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#09090b] px-2 text-[10px] text-white/30 font-mono uppercase">
                                    Upload Screenshot
                                </span>
                            </div>

                            {/* File Upload Area */}
                            <div className="space-y-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {!previewUrl ? (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border border-dashed border-white/10 hover:border-[#e2ff3d]/50 bg-white/[0.02] py-8 flex flex-col items-center gap-3 transition-colors group rounded-xl"
                                    >
                                        <div className="w-12 h-12 bg-white/5 group-hover:bg-[#e2ff3d]/10 flex items-center justify-center rounded-full transition-colors">
                                            <Upload className="w-5 h-5 text-white/40 group-hover:text-[#e2ff3d] transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white text-sm font-bold mb-1">
                                                Upload Screenshot
                                            </p>
                                            <p className="text-white/30 text-[10px] font-mono">
                                                PNG, JPG or WEBP (max 10MB)
                                            </p>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="relative">
                                        <img
                                            src={previewUrl}
                                            alt="Screenshot preview"
                                            className="w-full max-h-48 object-contain border border-white/10 bg-zinc-900"
                                        />
                                        <button
                                            onClick={() => setPreviewUrl(null)}
                                            className="absolute top-2 right-2 bg-black/80 hover:bg-red-500/80 p-1.5 transition-colors"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-[#e2ff3d]/20 px-2 py-1 text-[10px] text-[#e2ff3d] font-bold">
                                            <CheckCircle className="w-3 h-3" />
                                            Ready for verification
                                        </div>
                                    </div>
                                )}

                                {/* Verify Button */}
                                <button
                                    onClick={handleVerify}
                                    disabled={!previewUrl || verifying}
                                    className="w-full bg-[#e2ff3d] hover:bg-white text-black font-black uppercase py-4 tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group rounded-xl"
                                >
                                    {verifying ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            Verifying...
                                        </span>
                                    ) : (
                                        <>
                                            [ VERIFY & CLAIM ]
                                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>

                                {/* Privacy Note */}
                                <p className="text-[9px] text-zinc-600 font-mono text-center">
                                    // Screenshot stored locally only • No server upload
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
