'use client'

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Zap, ArrowRight, ShieldCheck, Clock, Terminal, Trophy, Activity, Wallet, Info, Gift } from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { toast } from 'sonner'
import ReCAPTCHA from 'react-google-recaptcha'
import WalletModal from '@/components/WalletModal'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
}

function FaucetContent() {
    const { address, isConnected } = useAccount()
    const searchParams = useSearchParams()

    const [targetAddress, setTargetAddress] = useState('')
    const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle')
    const [terminalLogs, setTerminalLogs] = useState<string[]>([])
    const [cooldownTime, setCooldownTime] = useState<number | null>(null)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)

    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
    const [referralCode, setReferralCode] = useState<string | null>(null)

    // Global Balance Refresh
    const { refetch: refetchBalance } = useBalance({ address })

    // Incentive State
    const [userProfile, setUserProfile] = useState<{ points: number, total_claims: number } | null>(null)

    const fetchProfile = useCallback(async (addr: string) => {
        try {
            const res = await fetch(`/api/incentive/profile?address=${addr}`)
            if (res.ok) {
                const data = await res.json()
                setUserProfile(data)
            }
        } catch (e) { console.error('Profile fetch failed') }
    }, [])

    useEffect(() => {
        if (address) {
            setTargetAddress(address)
            fetchProfile(address)
        }
    }, [address, fetchProfile])

    // Referral Param Tracking
    useEffect(() => {
        const ref = searchParams.get('ref')
        if (ref) {
            localStorage.setItem('referralCode', ref)
            setReferralCode(ref)
        } else {
            const saved = localStorage.getItem('referralCode')
            if (saved) setReferralCode(saved)
        }
    }, [searchParams])

    const addLog = (msg: string) => {
        setTerminalLogs(prev => [...prev.slice(-6), `> ${msg}`])
    }

    const handleClaim = async () => {
        if (!targetAddress || !recaptchaToken) return

        setStatus('requesting')
        setTerminalLogs(['INITIALIZING_HANDSHAKE...'])

        try {
            const res = await fetch('/api/faucet', {
                method: 'POST',
                body: JSON.stringify({
                    address: targetAddress,
                    recaptchaToken,
                    referralCode: localStorage.getItem('referralCode')
                }),
                headers: { 'Content-Type': 'application/json' }
            })

            const data = await res.json()

            if (res.ok) {
                addLog('VERIFYING_RECAPTCHA...')
                addLog('DISBURSING_10_ZUG...')
                setTxHash(data.hash)
                setStatus('success')
                addLog('TRANSACTION_CONFIRMED')

                const pts = data.pointsEarned || 25;
                const multiplier = data.multiplierApplied || 1.0;
                const isBoosted = multiplier > 1.0;

                if (data.referralBonus) {
                    addLog('REFERRAL_WELCOME_BONUS: +50')
                    toast.success('Welcome Bonus Awarded!', {
                        description: `10 ZUG + ${pts} Points sent (Includes Welcome Bonus).`
                    })
                } else {
                    addLog(`INCENTIVE_POINTS: +${pts} ${isBoosted ? `(${multiplier}x BOOST)` : ''}`)
                    toast.success('Disbursement Successful', {
                        description: `10 ZUG and ${pts} Incentive Points awarded.${isBoosted ? ' (Boost Active)' : ''}`,
                    })
                }

                // REAL-TIME UPDATES (No Refresh Needed)
                setTimeout(() => {
                    if (address) fetchProfile(address)
                    refetchBalance()
                }, 1000)

            } else {
                if (data.error === 'COOLDOWN_ACTIVE') {
                    setCooldownTime(data.timeLeft)
                    addLog('ERROR: COOLDOWN_ACTIVE')
                    toast.error('Access Denied', {
                        description: `Wait ${Math.floor(data.timeLeft / 3600)}h before next claim.`,
                    })
                } else {
                    addLog(`ERROR: ${data.error}`)
                    toast.error('Protocol Error', { description: data.error })
                }
                setStatus('error')
            }
        } catch (err) {
            addLog('ERROR: CONNECTION_FAILED')
            setStatus('error')
            toast.error('Connection Failed', { description: 'Check network status.' })
        }
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return `${h}h ${m}m remaining`
    }

    return (
        <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-6">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="space-y-6"
            >
                {/* 1. Header - Synced with Staking V3 */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between items-start gap-4 pb-4 border-b border-white/[0.05]">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <span className="w-4 h-[1px] bg-white" />
                            <span className="text-mono text-[8px] font-bold tracking-widest uppercase italic font-mono">Disbursement protocol</span>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                            ZUG_FAUCET<span className="text-[#e2ff3d]">.</span>
                        </h1>
                        <p className="text-gray-500 text-[9px] font-mono tracking-tight uppercase max-w-lg leading-relaxed">
                            Institutional portal for network asset distribution. Features reCAPTCHA node verification for sybil protection.
                        </p>
                    </div>
                </motion.div>



                {/* 2. Symmetrical Action Grid */}
                <div className="grid lg:grid-cols-12 gap-8 mt-12">
                    {/* Left Column: Actions */}
                    <div className="lg:col-span-7 space-y-6">
                        <motion.div variants={itemVariants} className="bg-[#0b0b0b] border border-white/5 p-8 space-y-8 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#e2ff3d]/5 blur-3xl rounded-full -mr-16 -mt-16" />

                            <div className="space-y-3 relative">
                                <label className="text-gray-600 text-[7px] font-mono font-bold tracking-[0.2em] uppercase flex items-center gap-2">
                                    <Wallet className="w-3 h-3" />
                                    RECIPIENT_ADDRESS
                                </label>
                                <input
                                    type="text"
                                    value={targetAddress}
                                    onChange={(e) => setTargetAddress(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full bg-white/[0.02] border border-white/10 py-4 px-5 text-xs font-mono text-white placeholder:text-white/5 focus:ring-1 focus:ring-[#e2ff3d]/20 focus:border-[#e2ff3d]/40 outline-none transition-all uppercase"
                                />
                            </div>

                            <div className="space-y-6 relative">
                                {/* reCAPTCHA Section - Optimized for mobile */}
                                {isConnected && targetAddress && (
                                    <div className="flex justify-center py-4 bg-white/[0.01] border border-white/5 overflow-hidden">
                                        <div className="scale-[0.85] sm:scale-100 origin-center transition-transform">
                                            <ReCAPTCHA
                                                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                                                onChange={(token: string | null) => setRecaptchaToken(token)}
                                                theme="dark"
                                            />
                                        </div>
                                    </div>
                                )}

                                {!isConnected ? (
                                    <button
                                        onClick={() => setIsWalletModalOpen(true)}
                                        className="w-full bg-[#e2ff3d] hover:bg-white text-black py-4 sm:py-5 font-black text-[11px] sm:text-[12px] tracking-[0.4em] uppercase transition-all flex items-center justify-center gap-4 group shadow-[0_0_20px_rgba(226,255,61,0.05)]"
                                    >
                                        CONNECT_WALLET
                                        <Wallet className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleClaim}
                                        disabled={status === 'requesting' || !targetAddress || !recaptchaToken}
                                        className="w-full bg-[#e2ff3d] hover:bg-white text-black py-4 sm:py-5 font-black text-[11px] sm:text-[12px] tracking-[0.4em] uppercase transition-all flex items-center justify-center gap-4 disabled:opacity-30 group shadow-[0_0_20px_rgba(226,255,61,0.05)]"
                                    >
                                        {status === 'requesting' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                {recaptchaToken ? 'AUTHORIZE_CLAIM' : 'SOLVE_CAPTCHA'}
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                )}

                                <div className="bg-black/80 border border-white/5 p-5 font-mono">
                                    <div className="flex items-center justify-between mb-3 border-b border-white/[0.05] pb-2">
                                        <div className="flex items-center gap-2">
                                            <Terminal className="w-3 h-3 text-[#e2ff3d]/30" />
                                            <span className="text-[7px] text-gray-500 font-bold tracking-widest uppercase">System_Logs</span>
                                        </div>
                                        <div className="flex gap-1 opacity-20">
                                            <div className="w-1 h-1 rounded-full bg-red-500" />
                                            <div className="w-1 h-1 rounded-full bg-yellow-500" />
                                            <div className="w-1 h-1 rounded-full bg-green-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 min-h-[80px]">
                                        {terminalLogs.length === 0 && (
                                            <span className="text-white/5 text-[9px] uppercase tracking-tighter">System Idle...</span>
                                        )}
                                        {terminalLogs.map((log, i) => (
                                            <div key={i} className={`text-[9px] tracking-tight ${log.startsWith('> ERROR') ? 'text-red-500' : 'text-[#e2ff3d]/60'}`}>
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Status & Intel */}
                    <div className="lg:col-span-5 space-y-6">
                        <motion.div variants={itemVariants} className="p-8 bg-[#0b0b0b] border border-white/5 space-y-6 relative group hover:border-[#e2ff3d]/10 transition-colors shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
                                <h3 className="text-[9px] font-black tracking-[0.2em] uppercase text-white flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-[#e2ff3d]" />
                                    INCENTIVE_REPORT
                                </h3>
                                <div className="px-2 py-0.5 border border-[#e2ff3d]/20 bg-[#e2ff3d]/5 text-[#e2ff3d] text-[7px] font-bold uppercase tracking-tighter italic">
                                    verified
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-0">
                                    <span className="text-[7px] font-mono text-gray-600 font-bold uppercase tracking-widest">Global_Points</span>
                                    <p className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
                                        {userProfile ? userProfile.points : '--'}
                                    </p>
                                </div>
                                <div className="space-y-0 border-l border-white/5 pl-6">
                                    <span className="text-[7px] font-mono text-gray-600 font-bold uppercase tracking-widest">Multiplier</span>
                                    <p className="text-2xl font-black text-[#e2ff3d]/80 tracking-tighter leading-none pt-1">
                                        1.2x<span className="text-[10px] opacity-40 ml-1">STABLE</span>
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-gray-500 font-mono uppercase text-[7px] font-bold tracking-widest">Claimed_Sessions</span>
                                    <span className="font-mono text-[10px] text-white font-bold">{userProfile ? userProfile.total_claims : '0'} UNIT</span>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-gray-500 font-mono uppercase text-[7px] font-bold tracking-widest">Protocol_Identity</span>
                                    <span className="font-mono text-[9px] text-[#e2ff3d]/60 font-bold uppercase">VAL_CONTRACTOR_L1</span>
                                </div>
                            </div>

                            <div className="p-4 bg-[#e2ff3d]/5 border border-[#e2ff3d]/10 flex gap-3">
                                <Activity className="w-3 h-3 text-[#e2ff3d] shrink-0 mt-0.5" />
                                <p className="text-[9px] text-gray-500 font-mono leading-relaxed uppercase opacity-80">
                                    Global points are indexed via DB. Cumulative metrics refresh on every successful disbursement.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="p-5 border border-white/5 flex items-center justify-between opacity-50">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-3 h-3 text-green-500" />
                                <span className="text-[8px] font-mono text-gray-400 font-bold uppercase tracking-widest italic">SYBIL_PROT_ACTIVE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] text-gray-700 font-bold uppercase tabular-nums tracking-tighter px-2 py-0.5 border border-white/5 bg-white/[0.02]">
                                    MAX_LIMIT: 10 ZUG / 24H
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {status === 'error' && cooldownTime && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-12 right-12 p-8 bg-red-500/10 border border-red-500/20 backdrop-blur-xl flex items-center gap-6 z-50 shadow-2xl"
                    >
                        <div className="w-12 h-12 bg-red-500/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-white text-[10px] font-bold uppercase tracking-[0.2em]">Cooldown_Synchronized</h4>
                            <p className="text-red-500/80 text-[11px] font-mono uppercase font-black">{formatTime(cooldownTime)}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <WalletModal
                open={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
            />
        </div>
    )
}

export default function FaucetPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#e2ff3d]" /></div>}>
            <FaucetContent />
        </Suspense>
    )
}
