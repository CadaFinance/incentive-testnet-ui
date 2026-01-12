'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileJson, CheckCircle2, AlertCircle, ArrowRight, Wallet, Info } from 'lucide-react';
import { toast } from 'sonner';

// Standard Ethereum Deposit Contract ABI
// Standard Ethereum Deposit Contract ABI
const DEPOSIT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "bytes", "name": "pubkey", "type": "bytes" },
            { "indexed": false, "internalType": "bytes", "name": "withdrawal_credentials", "type": "bytes" },
            { "indexed": false, "internalType": "bytes", "name": "amount", "type": "bytes" },
            { "indexed": false, "internalType": "bytes", "name": "signature", "type": "bytes" },
            { "indexed": false, "internalType": "bytes", "name": "index", "type": "bytes" }
        ],
        "name": "DepositEvent",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "bytes", "name": "pubkey", "type": "bytes" },
            { "internalType": "bytes", "name": "withdrawal_credentials", "type": "bytes" },
            { "internalType": "bytes", "name": "signature", "type": "bytes" },
            { "internalType": "bytes32", "name": "deposit_data_root", "type": "bytes32" }
        ],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "get_deposit_count",
        "outputs": [{ "internalType": "bytes", "name": "", "type": "bytes" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "get_deposit_root",
        "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }],
        "name": "supportsInterface",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "pure",
        "type": "function"
    }
] as const;

const DEPOSIT_CONTRACT_ADDRESS = '0x00000000219ab540356cBB839Cbe05303d7705Fa';

export default function LaunchpadPage() {
    const { address, isConnected } = useAccount();
    const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Deposit
    const [depositData, setDepositData] = useState<any[]>([]);
    const [currentValidatorIndex, setCurrentValidatorIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { writeContract, data: hash, isPending } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    // Track completed deposits per session
    const [completedPubkeys, setCompletedPubkeys] = useState<Set<string>>(new Set());

    // Effect: Mark status as completed when txn is confirmed on-chain
    useEffect(() => {
        if (isConfirmed && depositData[currentValidatorIndex]) {
            const pubkey = depositData[currentValidatorIndex].pubkey;
            setCompletedPubkeys(prev => new Set(prev).add(pubkey));
            toast.success("Deposit Confirmed On-Chain! 🎉");
        }
    }, [isConfirmed, currentValidatorIndex, depositData]);

    const isCurrentCompleted = depositData[currentValidatorIndex] && completedPubkeys.has(depositData[currentValidatorIndex].pubkey);

    // Unified File Processor
    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!Array.isArray(json)) throw new Error('Invalid JSON format (Expected array)');
                if (!json[0].pubkey || !json[0].withdrawal_credentials) throw new Error('Invalid Deposit Data format');

                setDepositData(json);
                setStep(2);
                toast.success(`Loaded ${json.length} validator(s)`);
            } catch (err) {
                toast.error('Invalid deposit_data.json file');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    // Handle Input Change
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // Handle Drag & Drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files?.[0];
        if (file && file.name.endsWith('.json')) {
            processFile(file);
        } else if (file) {
            toast.error('Please upload a valid .json file');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Execute Deposit
    const handleDeposit = async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet first');
            return;
        }

        const validator = depositData[currentValidatorIndex];
        if (!validator) return;

        try {
            writeContract({
                address: DEPOSIT_CONTRACT_ADDRESS,
                abi: DEPOSIT_ABI,
                functionName: 'deposit',
                args: [
                    `0x${validator.pubkey}`,
                    `0x${validator.withdrawal_credentials}`,
                    `0x${validator.signature}`,
                    `0x${validator.deposit_data_root}`
                ],
                value: BigInt(validator.amount) * BigInt(1e9), // Convert gwei to wei (32 gwei * 1e9 = 32 ETH in wei)
            });

            // Note: In a real app we'd wait for confirmation before moving to next index
            // relying on useEffect for isConfirmed to advance would be better
        } catch (err) {
            displayError(err);
        }
    };

    // Helper to handle next step after success
    // (Simplified for this snippet - would use useEffect on hash/isConfirmed in production)

    const displayError = (err: any) => {
        toast.error(err.shortMessage || err.message || 'Deposit failed');
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#e2ff3d] selection:text-black font-sans">

            <main className="container mx-auto max-w-4xl px-6 lg:px-8 py-6 pt-24">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between items-start gap-4 pb-4 border-b border-white/[0.05]">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 opacity-40">
                                <span className="w-4 h-[1px] bg-white" />
                                <span className="text-[8px] font-bold tracking-widest uppercase italic font-mono">Validator Protocol</span>
                            </div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                                VALIDATOR_<span className="text-[#e2ff3d]">LAUNCHPAD</span>
                            </h1>
                            <p className="text-gray-500 text-[9px] font-mono tracking-tight uppercase max-w-lg">
                                Upload deposit_data.json to activate validators on ZugChain network.
                            </p>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex items-center gap-2">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div className={`w-7 h-7 flex items-center justify-center font-black text-[10px] transition-all border ${step >= s
                                        ? 'bg-[#e2ff3d] text-black border-[#e2ff3d]'
                                        : 'bg-transparent text-gray-600 border-white/10'
                                        }`}>
                                        {s}
                                    </div>
                                    {s < 3 && <div className={`w-6 h-[1px] ${step > s ? 'bg-[#e2ff3d]' : 'bg-white/10'}`} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Card */}
                    <div className="bg-[#0b0b0b] border border-white/5 p-6 shadow-2xl">

                        {/* STEP 1: UPLOAD */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-white flex items-center gap-2">
                                        <Upload className="w-3 h-3 text-[#e2ff3d]" /> UPLOAD_MODULE
                                    </h3>
                                </div>

                                <div
                                    className="border border-dashed border-white/10 hover:border-[#e2ff3d]/50 hover:bg-[#e2ff3d]/[0.02] p-12 transition-all cursor-pointer group"
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 mx-auto bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#e2ff3d]/30 transition-all">
                                            <Upload className="w-6 h-6 text-gray-600 group-hover:text-[#e2ff3d] transition-all" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">DROP_FILE_HERE</p>
                                            <p className="text-[8px] text-gray-600 font-mono mt-1 uppercase">or click to browse for deposit_data-*.json</p>
                                        </div>
                                        <button className="px-6 py-3 bg-white/5 border border-white/10 group-hover:bg-[#e2ff3d] group-hover:border-[#e2ff3d] group-hover:text-black text-white text-[9px] font-black uppercase tracking-[0.3em] transition-all">
                                            SELECT_FILE
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 bg-[#e2ff3d]/[0.02] border border-[#e2ff3d]/10 flex items-start gap-3">
                                    <Info className="w-4 h-4 text-[#e2ff3d] shrink-0 mt-0.5" />
                                    <div className="text-[9px] text-gray-500 font-mono uppercase">
                                        Make sure you generated this file using the official <span className="text-white">ZugChain Deposit CLI</span> or <span className="text-white">ZugChainDeposit.exe</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: REVIEW */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                    <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-white flex items-center gap-2">
                                        <FileJson className="w-3 h-3 text-[#e2ff3d]" /> REVIEW_VALIDATORS
                                    </h3>
                                    <span className="px-2 py-1 bg-[#e2ff3d]/10 border border-[#e2ff3d]/20 text-[#e2ff3d] text-[9px] font-black uppercase tracking-widest">
                                        {depositData.length} FOUND
                                    </span>
                                </div>

                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                                    {depositData.map((val, idx) => (
                                        <div key={idx} className="p-4 bg-[#050505]/40 inst-border flex items-center justify-between group hover:border-[#e2ff3d]/20 transition-all">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-white/5 border border-white/10">
                                                        <CheckCircle2 className="w-3 h-3 text-[#e2ff3d]" />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white">#VAL_{idx + 1}</span>
                                                </div>
                                                <div className="font-mono text-[10px] text-gray-500 truncate max-w-[180px] md:max-w-md">
                                                    {val.pubkey.substring(0, 12)}...{val.pubkey.substring(val.pubkey.length - 12)}
                                                </div>
                                            </div>
                                            <div className="text-right font-mono">
                                                <div className="text-sm font-black text-[#e2ff3d]">
                                                    {(parseInt(val.amount) / 1e9).toLocaleString()} ZUG
                                                </div>
                                                <div className="text-[8px] text-gray-600 uppercase font-bold">Deposit</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="py-3 px-6 bg-white/5 border border-white/10 hover:bg-white hover:text-black text-white font-black text-[9px] tracking-[0.3em] uppercase transition-all"
                                    >
                                        ← BACK
                                    </button>
                                    <div className="font-mono text-right">
                                        <span className="text-[8px] text-gray-600 uppercase font-bold block">Total_Required</span>
                                        <span className="text-xl font-black text-white">
                                            {depositData.reduce((acc, val) => acc + (parseInt(val.amount) / 1e9), 0).toLocaleString()} <span className="text-[10px] text-gray-600">ZUG</span>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setStep(3)}
                                        className="py-4 px-8 bg-[#e2ff3d] hover:bg-white text-black font-black text-[10px] tracking-[0.4em] uppercase transition-all flex items-center gap-2"
                                    >
                                        CONTINUE <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: DEPOSIT */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="p-2 bg-white/5 border border-white/10 hover:bg-white hover:text-black text-gray-500 transition-all"
                                        >
                                            <ArrowRight size={12} className="rotate-180" />
                                        </button>
                                        <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-white flex items-center gap-2">
                                            <Wallet className="w-3 h-3 text-[#e2ff3d]" /> EXECUTE_DEPOSIT
                                        </h3>
                                    </div>
                                    <span className="text-[9px] font-mono text-gray-600 uppercase">
                                        Validator {currentValidatorIndex + 1} of {depositData.length}
                                    </span>
                                </div>

                                <div className="p-6 bg-[#050505]/60 inst-border relative overflow-hidden">
                                    {/* Progress Bar */}
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
                                        <div
                                            className="h-full bg-[#e2ff3d] transition-all duration-500"
                                            style={{ width: `${((currentValidatorIndex + 1) / depositData.length) * 100}%` }}
                                        />
                                    </div>

                                    <div className="text-center space-y-4 pt-4">
                                        <div className="space-y-0">
                                            <span className="text-[7px] font-mono text-gray-600 font-bold uppercase tracking-widest block mb-1">Deposit_Amount</span>
                                            <div className="text-4xl font-black text-[#e2ff3d] tracking-tighter tabular-nums leading-none">
                                                {(parseInt(depositData[currentValidatorIndex]?.amount) / 1e9).toLocaleString()}<span className="text-sm text-gray-600 ml-2">ZUG</span>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-white/[0.02] border border-white/5">
                                            <span className="text-[8px] text-gray-600 uppercase font-bold block mb-1">Pubkey</span>
                                            <span className="text-[9px] font-mono text-white break-all">
                                                {depositData[currentValidatorIndex]?.pubkey}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {!isConnected ? (
                                    <div className="p-4 bg-red-500/5 border border-red-500/10 text-center">
                                        <p className="text-[10px] text-red-400/80 font-mono uppercase">
                                            Wallet connection required. Use navbar to connect.
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleDeposit}
                                        disabled={isPending || isConfirming || isCurrentCompleted}
                                        className={`w-full py-5 font-black text-[11px] tracking-[0.4em] uppercase transition-all flex items-center justify-center gap-2 ${isPending || isConfirming || isCurrentCompleted
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                            : 'bg-[#e2ff3d] hover:bg-white text-black'
                                            }`}
                                    >
                                        {isCurrentCompleted ? 'COMPLETED' : isPending ? 'CHECK_WALLET...' : isConfirming ? 'CONFIRMING...' : 'EXECUTE_DEPOSIT'}
                                        {!isPending && !isConfirming && !isCurrentCompleted && <CheckCircle2 size={14} />}
                                        {isCurrentCompleted && <CheckCircle2 size={14} className="text-green-500" />}
                                    </button>
                                )}

                                {hash && (
                                    <div className="text-center">
                                        <a
                                            href={`https://explorer.zugchain.io/tx/${hash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[9px] text-[#e2ff3d] font-mono uppercase tracking-widest hover:text-white transition-colors"
                                        >
                                            VIEW_TRANSACTION →
                                        </a>
                                    </div>
                                )}

                                {/* Navigation for multiple validators */}
                                {depositData.length > 1 && (
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => setCurrentValidatorIndex(Math.max(0, currentValidatorIndex - 1))}
                                            disabled={currentValidatorIndex === 0}
                                            className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                                        >
                                            ← PREV
                                        </button>
                                        <span className="font-mono text-[#e2ff3d] text-sm font-black">
                                            {currentValidatorIndex + 1} <span className="text-gray-600">/</span> {depositData.length}
                                        </span>
                                        <button
                                            onClick={() => setCurrentValidatorIndex(Math.min(depositData.length - 1, currentValidatorIndex + 1))}
                                            disabled={currentValidatorIndex === depositData.length - 1}
                                            className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                                        >
                                            NEXT →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </motion.div >
            </main >
        </div >
    );
}

