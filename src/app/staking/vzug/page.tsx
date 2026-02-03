"use client";

// Force dynamic rendering to avoid SSR issues with wagmi/Header
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useSwitchChain, useWalletClient } from "wagmi";
import { parseEther, formatEther, erc20Abi } from "viem";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
    Database,
    Box,
    Loader2,
    Zap,
    History,
    Settings2,
    Coins,
    ArrowRight,
    Clock,
    Activity,
    Lock as LockIcon,
    ShieldCheck,
    ArrowUpRight,
    AlertTriangle
} from 'lucide-react';
import { StakingHistory } from '@/components/StakingHistory';
import { formatZug } from "@/lib/utils";
import WalletModal from "@/components/WalletModal";
import { STAKING_CONTRACT_VZUG, VZUG_TOKEN } from "@/contracts";
import { CHAIN_ID, zugChain } from "../../../config";

// --- V4 CONFIG ---
const STAKING_CONTRACT = STAKING_CONTRACT_VZUG as `0x${string}`;
const VZUG_TOKEN_ADDRESS = VZUG_TOKEN as `0x${string}`;
const STAKING_ABI = [
    { inputs: [{ name: "_amount", type: "uint256" }, { name: "_tierId", type: "uint8" }, { name: "_autoCompound", type: "bool" }], name: "stake", outputs: [], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "_index", type: "uint256" }], name: "requestUnstake", outputs: [], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "_index", type: "uint256" }], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "_index", type: "uint256" }], name: "claim", outputs: [], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "_index", type: "uint256" }], name: "compound", outputs: [], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "_index", type: "uint256" }], name: "toggleAutoCompound", outputs: [], stateMutability: "nonpayable", type: "function" },
    { inputs: [], name: "claimAll", outputs: [], stateMutability: "nonpayable", type: "function" },
    {
        inputs: [{ name: "_user", type: "address" }],
        name: "getUserDeposits",
        outputs: [{
            components: [
                { name: "amount", type: "uint256" },
                { name: "weightedAmount", type: "uint256" },
                { name: "rewardDebt", type: "uint256" },
                { name: "lockEndTime", type: "uint256" },
                { name: "unbondingEnd", type: "uint256" },
                { name: "tierId", type: "uint8" },
                { name: "isWithdrawn", type: "bool" },
                { name: "totalClaimed", type: "uint256" },
                { name: "totalCompounded", type: "uint256" },
                { name: "useAutoCompound", type: "bool" },
                { name: "lastAutoCompound", type: "uint256" }
            ],
            name: "",
            type: "tuple[]"
        }],
        stateMutability: "view",
        type: "function"
    },
    { inputs: [{ name: "_user", type: "address" }], name: "totalPendingReward", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "_user", type: "address" }, { name: "_depositIndex", type: "uint256" }], name: "pendingReward", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "totalWeightedStake", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "_tierId", type: "uint8" }], name: "getEffectiveAPY", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }
];

const TIERS = [
    { id: 0, name: "Flexible", duration: "No Lock", multiplier: 1.0, multiplierText: "1.0x" },
    { id: 1, name: "Gold", duration: "30 Days", multiplier: 1.2, multiplierText: "1.2x" },
    { id: 2, name: "Platinum", duration: "90 Days", multiplier: 1.5, multiplierText: "1.5x" }
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};

export default function TokenStakingPage() {
    const { address, isConnected, chainId } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const [stakeAmount, setStakeAmount] = useState("");
    const [selectedTier, setSelectedTier] = useState(0);
    const [autoCompoundPref, setAutoCompoundPref] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    // TRIGGER: Add state
    const [historyTrigger, setHistoryTrigger] = useState(0);

    // Reads
    const { data: vzugBalance, refetch: refetchBalance } = useReadContract({
        address: VZUG_TOKEN_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address || "0x"],
        query: { enabled: !!address, refetchInterval: 5000 }
    });

    // FETCH TVL (Contract Balance of vZUG)
    const { data: tvlData } = useBalance({
        address: STAKING_CONTRACT,
        token: VZUG_TOKEN_ADDRESS,
        query: { refetchInterval: 10000 }
    });

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: VZUG_TOKEN_ADDRESS, abi: erc20Abi, functionName: "allowance", args: [address || "0x", STAKING_CONTRACT],
        query: { enabled: !!address, refetchInterval: 5000 }
    });

    const { data: rawDeposits, refetch: refetchDeposits } = useReadContract({
        address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "getUserDeposits", args: [address],
        query: { enabled: !!address, refetchInterval: 5000 }
    });

    const { data: totalPending, refetch: refetchPending } = useReadContract({
        address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "totalPendingReward", args: [address],
        query: { enabled: !!address, refetchInterval: 5000 }
    });

    const { data: totalWeightedStake } = useReadContract({
        address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "totalWeightedStake",
        query: { refetchInterval: 5000 }
    });

    // Fetch APY from contract for each tier
    const { data: apy0 } = useReadContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "getEffectiveAPY", args: [0], query: { refetchInterval: 5000 } });
    const { data: apy1 } = useReadContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "getEffectiveAPY", args: [1], query: { refetchInterval: 5000 } });
    const { data: apy2 } = useReadContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "getEffectiveAPY", args: [2], query: { refetchInterval: 5000 } });

    const getAPY = (tierId: number) => {
        const apyData = tierId === 0 ? apy0 : tierId === 1 ? apy1 : apy2;
        if (!apyData) return "~...%";
        const bps = Number(apyData);
        return `~${(bps / 100).toFixed(0)}%`;
    };

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });
    const { data: walletClient } = useWalletClient();

    const handleSwitchNetwork = async () => {
        try {
            if (walletClient) {
                try {
                    await walletClient.addChain({ chain: zugChain });
                } catch (ignored) { }
            }
            await switchChainAsync({ chainId: CHAIN_ID });
        } catch (e) {
            console.error("Switch error", e);
        }
    };

    useEffect(() => {
        if (isTxSuccess && txHash) {
            const syncPoints = async () => {
                try {
                    await fetch('/api/incentive/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ txHash, walletAddress: address })
                    });
                    toast.success("Transaction Confirmed", {
                        description: "Synchronizing Stake & Calculating Boosted Points..."
                    });
                    // TRIGGER: Update history
                    setHistoryTrigger(prev => prev + 1);
                } catch (e) { console.error(e); }
            };
            syncPoints();
            setStakeAmount("");
        }
    }, [isTxSuccess, txHash, address]);

    // Actions
    const handleApprove = () => {
        if (!stakeAmount) return;
        writeContract({
            address: VZUG_TOKEN_ADDRESS, abi: erc20Abi, functionName: "approve",
            args: [STAKING_CONTRACT, parseEther(stakeAmount)]
        });
    };

    const handleStake = () => {
        console.log("Submit Stake Clicked");
        console.log("Stake Amount:", stakeAmount);
        console.log("Tier:", selectedTier);
        console.log("Contract:", STAKING_CONTRACT);
        console.log("Address:", address);

        if (!stakeAmount || Number(stakeAmount) <= 0) return toast.error("Invalid Amount");

        try {
            writeContract({
                address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "stake",
                args: [parseEther(stakeAmount), selectedTier, autoCompoundPref]
            }, {
                onError: (err) => {
                    console.error("WriteContract Error:", err);
                    toast.error("Stake Failed: " + err.message);
                }
            });
        } catch (err) {
            console.error("HandleStake Error:", err);
        }
    };

    const handleClaimAll = () => {
        writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "claimAll", args: [] });
    };

    const handleClaim = (id: number) => {
        writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "claim", args: [BigInt(id)] });
    }

    const handleUnstake = (id: number) => {
        writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "requestUnstake", args: [BigInt(id)] });
    }

    const handleWithdraw = (id: number) => {
        writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "withdraw", args: [BigInt(id)] });
    }

    const handleCompound = (id: number) => {
        writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "compound", args: [BigInt(id)] });
    }

    const handleToggleAutoPref = (id: number) => {
        writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "toggleAutoCompound", args: [BigInt(id)] });
    }

    // Common Logic
    const vBalance = vzugBalance ? Number(formatEther(vzugBalance)) : 0;
    const currentAllowance = allowance ? Number(formatEther(allowance)) : 0;
    const amt = parseFloat(stakeAmount || "0");
    const needsApproval = amt > 0 && amt > currentAllowance;
    const hasInsufficientBalance = amt > 0 && amt > vBalance;

    const deposits = (rawDeposits as any[])
        ?.map((d, i) => ({ ...d, originalIndex: i }))
        ?.filter(d => !d.isWithdrawn) || [];
    const activeStaked = deposits.filter(d => Number(d.unbondingEnd) === 0).reduce((acc, curr) => acc + Number(formatEther(curr.amount)), 0);
    const unbondingStaked = deposits.filter(d => Number(d.unbondingEnd) > 0).reduce((acc, curr) => acc + Number(formatEther(curr.amount)), 0);
    const totalStaked = activeStaked + unbondingStaked;

    // Position Card Component
    const PositionCard = ({ deposit, index }: { deposit: any, index: number }) => {
        const originalId = BigInt(deposit.originalIndex);
        const isUnbonding = deposit.unbondingEnd > 0n;
        const isLocked = !isUnbonding && (Number(deposit.lockEndTime) > Date.now() / 1000);
        const tier = TIERS[deposit.tierId];

        // Individual Pending Read
        const { data: individualPending } = useReadContract({
            address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: "pendingReward", args: [address, originalId],
            query: { enabled: !!address, refetchInterval: 3000 }
        });

        // 7-Day Minimum Stake Duration Logic
        const tierDurations = [0, 30 * 24 * 60 * 60, 90 * 24 * 60 * 60]; // seconds
        const stakedAt = Number(deposit.lockEndTime) - tierDurations[deposit.tierId];
        const minHoldingPeriod = 7 * 24 * 60 * 60; // 7 days in seconds
        const minExitTime = stakedAt + minHoldingPeriod;
        const currentTime = Math.floor(Date.now() / 1000);
        const isHeldUnder7Days = currentTime < minExitTime;

        // Calculate remaining time for the 7-day cooldown
        const remainingSeconds = minExitTime - currentTime;
        const remainingDays = Math.ceil(remainingSeconds / (24 * 60 * 60));

        return (
            <div className="p-8 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[32px] relative group hover:border-[#e2ff3d]/20 transition-all">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 border border-white/10 rounded-xl">
                            <Box className="w-4 h-4 text-[#e2ff3d]" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white">#POS_{deposit.originalIndex + 1}</h4>
                            <span className={`text-[9px] font-mono uppercase ${tier.id === 2 ? 'text-cyan-400' : tier.id === 1 ? 'text-yellow-400' : 'text-white/40'}`}>
                                {tier.name}
                            </span>
                        </div>
                    </div>
                    {isUnbonding ? (
                        <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} /> Unbonding
                        </div>
                    ) : isLocked ? (
                        <div className="px-2 py-1 bg-white/5 border border-white/10 text-white/40 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 rounded-lg">
                            <LockIcon size={10} /> Locked
                        </div>
                    ) : (
                        <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <Activity size={10} /> Active
                        </div>
                    )}
                </div>

                <div className="space-y-6 font-mono">
                    {/* Main Stats Block */}
                    <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                        <div className="space-y-1">
                            <span className="text-[8px] text-white/40 uppercase font-black">Bonded</span>
                            <div className="text-sm font-bold text-white">{formatZug(Number(formatEther(deposit.amount)))}</div>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-[8px] text-[#e2ff3d]/60 uppercase font-black">Yielding</span>
                            <div className="text-sm font-bold text-[#e2ff3d]">+{individualPending ? formatEther(individualPending as bigint).substring(0, 8) : "0.000"}</div>
                        </div>
                    </div>

                    {/* Breakdown Stats */}
                    <div className="grid grid-cols-2 gap-2 py-2 text-[9px]">
                        <div className="space-y-1 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                            <span className="text-white/40 uppercase block font-bold">Claimed</span>
                            <span className="text-white font-mono">{Number(formatEther(deposit.totalClaimed)).toFixed(2)}</span>
                        </div>
                        <div className="space-y-1 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                            <span className="text-white/40 uppercase block font-bold">Compounded</span>
                            <span className="text-white font-mono">{Number(formatEther(deposit.totalCompounded)).toFixed(2)}</span>
                        </div>
                    </div>

                    {isUnbonding ? (
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] text-blue-500/70 uppercase">Releases</span>
                                <span className="text-[10px] text-blue-400">{new Date(Number(deposit.unbondingEnd) * 1000).toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => handleWithdraw(Number(originalId))}
                                disabled={isPending || Date.now() / 1000 < Number(deposit.unbondingEnd)}
                                className="w-full py-3 bg-blue-500/10 hover:bg-green-500 hover:text-black border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 rounded-xl"
                            >
                                {Date.now() / 1000 < Number(deposit.unbondingEnd) ? "COOLDOWN_ACTIVE" : "FINALIZE_EXIT"}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Layout as requested: Compound Full Width, Claim/Exit yan yana */}
                            {!deposit.useAutoCompound && (
                                <button
                                    onClick={() => handleCompound(Number(originalId))}
                                    disabled={isPending}
                                    className="w-full py-3 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 hover:bg-[#e2ff3d] hover:text-black text-[9px] font-black uppercase tracking-[0.2em] text-[#e2ff3d] transition-all rounded-xl"
                                >
                                    MANUAL_COMPOUND
                                </button>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleClaim(Number(originalId))}
                                    disabled={isPending}
                                    className="py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-black text-[9px] font-black uppercase tracking-[0.2em] text-white transition-all disabled:opacity-30 rounded-xl"
                                >
                                    CLAIM
                                </button>
                                <button
                                    onClick={() => handleUnstake(Number(originalId))}
                                    disabled={isPending || isLocked || isHeldUnder7Days}
                                    className={`py-3 border text-[9px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 rounded-xl ${isLocked || isHeldUnder7Days ? 'bg-transparent border-white/5 text-white/20 cursor-not-allowed' : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'}`}
                                >
                                    {isHeldUnder7Days && !isLocked ? `LOCKED_${remainingDays}D` : "EXIT"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-[#e2ff3d] selection:text-black font-sans">

            <main className="container mx-auto max-w-7xl px-6 lg:px-8 py-6">
                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">

                    {/* 1. Header & Global Stats */}
                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between items-start gap-4 pb-4 border-b border-white/[0.05]">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-white tracking-tight">
                                vZUG Vault <span className="text-[#e2ff3d]">V4</span>
                            </h1>
                            <p className="text-white/50 text-xs font-medium max-w-lg leading-relaxed">
                                Liquid staking derivative vault. Optimized for high-fidelity yield capture and network liquidity.
                            </p>
                        </div>


                        <div className="flex flex-wrap items-center gap-8 pt-4 sm:pt-0">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Active Weight</span>
                                <div className="text-xl font-bold text-white tracking-tight tabular-nums font-mono">
                                    {formatZug(activeStaked)}<span className="text-[10px] text-white/20 ml-1">VZUG</span>
                                </div>
                            </div>
                            <div className="space-y-1 border-l border-white/10 pl-6">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Unbonding</span>
                                <div className="text-xl font-bold text-white/80 tracking-tight tabular-nums font-mono">
                                    {formatZug(unbondingStaked)}<span className="text-[10px] text-white/20 ml-1">VZUG</span>
                                </div>
                            </div>
                            <div className="space-y-1 border-l border-white/10 pl-6">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Total Yield</span>
                                <div className="text-xl font-bold text-white tracking-tight tabular-nums font-mono flex items-center gap-2">
                                    +{formatEther(typeof totalPending === 'bigint' ? totalPending : 0n).substring(0, 8)}
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#e2ff3d]" />
                                </div>
                            </div>
                            {/* NEW: PROTOCOL TVL */}
                            <div className="space-y-1 border-l border-white/10 pl-6 hidden sm:block">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">TVL</span>
                                <div className="text-xl font-bold text-white tracking-tight tabular-nums font-mono">
                                    {tvlData ? formatZug(Number(formatEther(tvlData.value))) : "Loading..."}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="grid lg:grid-cols-12 gap-8 mt-12">

                        {/* 2. CREATOR TERMINAL */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 rounded-[32px] sticky top-24 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xs font-bold tracking-wide text-white flex items-center gap-2">
                                        <Database className="w-3 h-3 text-[#e2ff3d]" /> Stake vZUG
                                    </h3>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#e2ff3d]/10 rounded-full">
                                        <div className="w-1.5 h-1.5 bg-[#e2ff3d] rounded-full animate-pulse" />
                                        <span className="text-[10px] font-bold text-[#e2ff3d]">Live</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Tier Select */}
                                    <div className="grid grid-cols-1 gap-2">
                                        {TIERS.map((tier) => (
                                            <button
                                                key={tier.id}
                                                onClick={() => setSelectedTier(tier.id)}
                                                className={`flex justify-between items-center p-4 border transition-all ${selectedTier === tier.id
                                                    ? "bg-[#e2ff3d]/5 border-[#e2ff3d]/50"
                                                    : "bg-white/[0.01] border-white/5 hover:bg-white/5"
                                                    } rounded-2xl`}
                                            >
                                                <div className="text-left font-mono">
                                                    <div className={`text-[10px] font-black uppercase tracking-wider ${selectedTier === tier.id ? 'text-[#e2ff3d]' : 'text-white/40'}`}>{tier.name}</div>
                                                    <div className="text-[8px] text-white/20 mt-1 uppercase">{tier.duration} LOCK</div>
                                                </div>
                                                <div className="text-right font-mono">
                                                    <div className="text-[14px] font-black tracking-tighter text-white">{getAPY(tier.id)}</div>
                                                    <div className="text-[8px] text-[#e2ff3d] uppercase font-bold">{tier.multiplierText}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Auto-Compound Selector */}
                                    <div className="p-4 bg-white/[0.02] border border-white/5 flex items-center justify-between rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <Settings2 className="w-4 h-4 text-white/30" />
                                            <div>
                                                <div className="text-xs font-bold text-white tracking-wide">Auto Compound</div>
                                                <div className="text-[10px] text-white/40 mt-0.5">Automated Re-staking</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setAutoCompoundPref(!autoCompoundPref)}
                                            className={`px-3 py-1.5 border text-[10px] font-bold tracking-wide transition-all rounded-lg ${autoCompoundPref ? 'bg-[#e2ff3d] border-[#e2ff3d] text-black' : 'bg-transparent border-white/10 text-white hover:border-white/30'}`}
                                        >
                                            {autoCompoundPref ? 'Active' : 'Off'}
                                        </button>
                                    </div>

                                    {/* Amount Input */}
                                    <div className="space-y-3 relative">
                                        <div className="flex justify-between items-center">
                                            <label className="text-white/50 text-[10px] font-bold tracking-wide flex items-center gap-2">
                                                vZUG Amount
                                            </label>
                                            <span className="text-white/50 text-[7px] font-mono font-bold uppercase tracking-tight">
                                                BAL: {formatEther(vzugBalance || 0n).substring(0, 10)}
                                            </span>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={stakeAmount}
                                                onChange={(e) => setStakeAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full bg-white/[0.02] border border-white/10 py-4 px-5 text-xs font-mono text-white placeholder:text-white/5 focus:ring-1 focus:ring-[#e2ff3d]/20 focus:border-[#e2ff3d]/40 outline-none transition-all rounded-2xl"
                                            />
                                            <button
                                                onClick={() => setStakeAmount(vzugBalance ? formatEther(vzugBalance) : "0")}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-[#e2ff3d] hover:text-white tracking-widest"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main CTA */}
                                    {!isConnected ? (
                                        <button
                                            onClick={() => setIsWalletModalOpen(true)}
                                            className="w-full py-4 bg-white text-black font-bold text-sm transition-all hover:bg-white/90 rounded-xl"
                                        >
                                            Connect Wallet
                                        </button>
                                    ) : chainId !== CHAIN_ID ? (
                                        <button
                                            onClick={handleSwitchNetwork}
                                            className="w-full py-4 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 font-bold text-sm transition-all flex items-center justify-center gap-2 rounded-xl"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            Switch Network
                                        </button>
                                    ) : hasInsufficientBalance ? (
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => window.open('https://www.zugchain.org/presale', '_blank')}
                                                className="w-full py-4 bg-[#e2ff3d] hover:bg-[#d4f030] text-black font-bold text-sm transition-all flex items-center justify-center gap-2 rounded-xl"
                                            >
                                                <ArrowUpRight className="w-4 h-4" />
                                                Claim vZUG
                                            </button>
                                            <div className="flex items-center justify-center gap-2 py-2 px-3 bg-red-500/5 border border-red-500/10 text-red-400 rounded-lg">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span className="text-xs font-medium">
                                                    Insufficient balance (+{(amt - vBalance).toFixed(2)} needed)
                                                </span>
                                            </div>
                                        </div>
                                    ) : needsApproval ? (
                                        <button
                                            onClick={handleApprove}
                                            disabled={isPending}
                                            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 rounded-xl"
                                        >
                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grant Approval"}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleStake}
                                            disabled={isPending}
                                            className="w-full py-4 bg-[#e2ff3d] hover:bg-[#d4f030] text-black font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#e2ff3d]/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Stake vZUG"}
                                        </button>
                                    )}


                                </div>
                            </div>
                        </div>

                        {/* 3. POSITIONS GRID */}
                        <div className="lg:col-span-8 space-y-8">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <h3 className="text-xs font-bold text-white/50 tracking-wide">vZUG Positions</h3>
                                <History size={16} className="text-white/40" />
                            </div>

                            {deposits.length === 0 ? (
                                <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-white/10 bg-white/[0.01] rounded-2xl">
                                    <div className="p-4 bg-white/5 rounded-full mb-4 opacity-50"><Box size={24} className="text-white/40" /></div>
                                    <p className="text-sm font-medium text-white/60">No active positions</p>
                                    <p className="text-xs text-white/30 mt-2">Your staked vZUG will appear here</p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {deposits.map((deposit, idx) => (
                                        <PositionCard key={idx} deposit={deposit} index={idx} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-12">
                            <StakingHistory type="vZUG" />
                        </div>

                    </div>

                </motion.div>
                <WalletModal open={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />
            </main>
        </div>
    );
}
