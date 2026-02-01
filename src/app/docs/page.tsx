"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
// No Lucide icons allowed per institutional guidelines
// No Lucide icons allowed per institutional guidelines
import Link from "next/link";

// --- Base Components ---

const CodeBlock = ({ code, language = "bash" }: { code: string; language?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group mt-4 mb-6 rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                <span className="text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider">{language}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white transition-colors"
                >
                    <span className="font-mono uppercase underline decoration-[#e2ff3d]/50 underline-offset-2">{copied ? "COPIED" : "COPY"}</span>
                </button>
            </div>
            <div className="p-4 overflow-x-auto custom-scrollbar">
                <pre className="text-[12px] font-mono text-gray-300 leading-relaxed whitespace-pre-wrap break-all sm:break-normal selection:bg-[#e2ff3d]/20 selection:text-[#e2ff3d]">
                    {code}
                </pre>
            </div>
        </div>
    );
};

const InfoCard = ({ label, value, sub }: { label: string, value: string, sub?: string }) => (
    <div className="p-6 bg-white/[0.01] border border-white/5 hover:border-[#e2ff3d]/30 transition-all duration-500 rounded-sm group relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[1px] h-0 bg-[#e2ff3d] group-hover:h-full transition-all duration-500" />
        <div className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-3 group-hover:text-[#e2ff3d] transition-colors">{label}</div>
        <div className="text-xl font-black text-white font-mono break-all tracking-tighter">{value}</div>
        {sub && <div className="text-[10px] text-gray-600 mt-2 font-serif italic">{sub}</div>}
    </div>
);

// --- Section Views ---

const IntroView = () => (
    <div className="space-y-24 pt-8  animate-in fade-in slide-in-from-bottom-8 duration-1000">



        {/* Why ZugChain Competes with Enterprise L1s (NEW SECTION) */}
        <section className="space-y-16  ">
            <div className="max-w-3xl">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 md:mb-6 font-serif italic text-white/90 leading-none">
                    Why ZugChain Competes with <br className="sm:hidden" />
                    <span className="text-[#e2ff3d]">Enterprise L1s</span>
                </h2>
                <p className="text-gray-500 font-serif italic text-base md:text-lg leading-relaxed">
                    ZugChain eliminates the trade-offs of legacy blockchains by providing institutional-grade transparency, permissionless security, and seamless developer onboarding.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5">
                {[
                    {
                        title: "Transparent Economics",
                        desc: "Unlike competitors with opaque token distributions, every ZUG allocation is public, verifiable, and governed by immutable smart contracts. No hidden unlocks, no team dumps."
                    },
                    {
                        title: "True Decentralization",
                        desc: "Anyone with 32,000 ZUG can run a validator. No permissioned validator sets, no central authorities controlling block production—just open, permissionless consensus."
                    },
                    {
                        title: "Developer Experience",
                        desc: "Deploy your existing Ethereum dApps with zero modifications. Full Solidity support, Web3.js, Ethers.js, Hardhat, Foundry—every tool you know works out of the box."
                    },
                    {
                        title: "Sustainable Security",
                        desc: "Security transitions from block rewards to fee market by Year 10. 50% fee burning ensures long-term deflationary pressure while validators earn sustainable yields."
                    }
                ].map((item, i) => (
                    <div key={i} className="bg-[#050505] p-6 md:p-10 space-y-4 hover:bg-white/[0.02] transition-colors relative group">
                        <div className="text-[10px] font-mono text-[#e2ff3d] opacity-40 group-hover:opacity-100 transition-opacity">0{i + 1}</div>
                        <h4 className="text-white font-black uppercase tracking-tight font-serif text-lg">{item.title}</h4>
                        <p className="text-gray-500 text-[11px] md:text-xs leading-relaxed italic">{item.desc}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* Core Pillars - Harmonized Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="relative overflow-hidden p-6 md:p-8 bg-white/[0.02] border border-white/5 rounded-lg group hover:border-[#e2ff3d]/30 transition-all duration-500">
                <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3 leading-tight">
                        <span className="text-gray-700 font-mono text-sm">01</span> Bitcoin Economics
                    </h3>
                    <p className="text-[11px] md:text-sm text-[#e2ff3d] font-mono mb-4 uppercase tracking-widest font-bold">
                        Verifiable Scarcity
                    </p>
                    <p className="text-gray-400 leading-relaxed text-[13px] md:text-sm mb-6 font-serif italic">
                        Hard-capped at 1 billion tokens with programmatic halving every 2 years. Zero central bank manipulation, zero arbitrary minting—only code-enforced issuance.
                    </p>
                    <ul className="space-y-3 text-[9px] md:text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                        <li className="flex items-start gap-4">
                            <span className="text-[#e2ff3d]">/</span>
                            <span>50 ZUG block reward with predictable halving schedule</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="text-[#e2ff3d]">/</span>
                            <span>Deflationary fee burning mechanism (50% burned)</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="relative overflow-hidden p-6 md:p-8 bg-white/[0.02] border border-white/5 rounded-lg group hover:border-[#e2ff3d]/30 transition-all duration-500">
                <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3 leading-tight">
                        <span className="text-gray-700 font-mono text-sm">02</span> Ethereum Security
                    </h3>
                    <p className="text-[11px] md:text-sm text-white font-mono mb-4 uppercase tracking-widest font-bold">
                        Battle-Tested Security
                    </p>
                    <p className="text-gray-400 leading-relaxed text-[13px] md:text-sm mb-6 font-serif italic">
                        Powered by Prysm Beacon Chain and Geth—the same battle-tested clients securing billions in Ethereum. Proof-of-Stake consensus with instant finality.
                    </p>
                    <ul className="space-y-3 text-[9px] md:text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                        <li className="flex items-start gap-4">
                            <span className="text-[#e2ff3d]">/</span>
                            <span>Sub-6 second block times with deterministic finality</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="text-[#e2ff3d]">/</span>
                            <span>Full EVM compatibility—deploy Solidity contracts instantly</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="relative overflow-hidden p-6 md:p-8 bg-white/[0.02] border border-white/5 rounded-lg group hover:border-[#e2ff3d]/30 transition-all duration-500 sm:col-span-2 lg:col-span-1">
                <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3 font-serif leading-tight">
                        <span className="text-gray-700 font-mono text-sm">03</span> N=256 Scalability
                    </h3>
                    <p className="text-[11px] md:text-sm text-[#e2ff3d] font-mono mb-4 uppercase tracking-widest font-bold font-serif italic">
                        Vertical Sharding
                    </p>
                    <p className="text-gray-400 leading-relaxed text-[13px] md:text-sm mb-6 font-serif italic">
                        Parallel transaction streams across 256 shards. Target throughput exceeds 100,000+ real-world TPS with sub-2s inter-shard latency.
                    </p>
                    <ul className="space-y-3 text-[9px] md:text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                        <li className="flex items-start gap-4">
                            <span className="text-[#e2ff3d]">/</span>
                            <span>Asynchronous Atomic Messaging (AAM) for cross-shard TX</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="text-[#e2ff3d]">/</span>
                            <span>Stateless execution for consumer-grade validation</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        {/* DIAGRAM: L1 SCALABILITY WITH 256 SHARDS (FROM WP) */}
        <section className="space-y-8">
            <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em] text-center">Vertical Sharding Scalability (N=256)</h3>
            <div className="p-12 border border-white/5 bg-white/[0.01] rounded-sm relative overflow-hidden group">
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 opacity-60">
                    {[...Array(32)].map((_, i) => (
                        <div key={i} className="aspect-square bg-white/5 border border-white/10 group-hover:bg-[#e2ff3d]/20 transition-all duration-700 hover:scale-110" style={{ transitionDelay: `${i * 10}ms` }} />
                    ))}
                </div>
                <div className="mt-10 flex flex-col items-center gap-4">
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#e2ff3d]/50 to-transparent" />
                    <p className="text-[10px] font-mono text-[#e2ff3d] tracking-widest uppercase">Target: 100,000+ TPS | Latency: {'<'} 2s Cross-Shard</p>
                </div>
            </div>
        </section>

        {/* Monolithic vs Vertical Sharded Comparison (FROM WP) */}
        <div className="grid md:grid-cols-2 gap-px bg-white/5 border border-white/5 overflow-hidden">
            <div className="bg-[#050505] p-10 space-y-6">
                <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-gray-600 mb-4">Old Paradigm: Monolithic</p>
                <div className="w-full h-32 bg-white/5 flex items-center justify-center relative">
                    <div className="w-12 h-12 bg-white/10 rounded-full animate-pulse border border-white/10" />
                </div>
                <p className="text-[9px] text-center italic text-gray-700">Serial Processing / Bottlenecking</p>
            </div>
            <div className="bg-[#050505] p-10 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#e2ff3d]/10 blur-[40px]" />
                <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-[#e2ff3d] mb-4">ZugChain Paradigm: Vertical Sharding</p>
                <div className="w-full h-32 flex items-center justify-around">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1.5 h-full bg-[#e2ff3d]/20 rounded-full relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-4 bg-[#e2ff3d] animate-bounce shadow-[0_0_10px_#e2ff3d]" style={{ animationDelay: `${i * 150}ms`, animationDuration: '2s' }} />
                        </div>
                    ))}
                </div>
                <p className="text-[9px] text-center italic text-white/40">Parallel Execution Across N=256</p>
            </div>
        </div>

        {/* Technical Excellence Banner */}
        <div className="relative overflow-hidden p-8 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-xl">
            <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center">
                    <div className="text-4xl font-black text-[#e2ff3d] mb-2 font-serif">6s</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest font-mono">Block Time</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-black text-white/40 mb-2 font-serif">1B</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest font-mono">Max Supply</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-black text-white/50 mb-2 font-serif">32K</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest font-mono">Validator Stake</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-black text-white mb-2 font-serif">N=256</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest font-mono">Shard Count</div>
                </div>
            </div>
        </div>
    </div>
);

const ArchitectureView = () => (
    <div className="space-y-24 pt-8  animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 md:mb-6 flex items-center gap-4 font-serif italic text-white/90 leading-none">
                Modular Hybridism
            </h2>
            <p className="text-gray-400 max-w-2xl text-base md:text-lg leading-relaxed mb-8 border-l-2 border-[#e2ff3d]/50 pl-6 md:pl-8 font-serif italic">
                Separation of Concerns: Geth handles execution isolation while Prysm/Gesper orchestrates decentralized global consensus via Engine API v3.
            </p>
        </div>

        {/* DIAGRAM: ARCHITECTURE STACK (FROM WP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center py-6 md:py-12">
            <div className="space-y-6 md:space-y-8 order-2 md:order-1">
                <div className="space-y-4">
                    <h4 className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest py-2 border-b border-[#e2ff3d]/30 inline-block font-mono">Core Protocol Stack</h4>
                    <p className="text-[11px] md:text-[12px] text-gray-400 leading-relaxed italic">
                        ZugChain decouples the execution layer from consensus. Geth (Execution) is optimized with a path-based flat DB, reducing storage overhead by 40%, while Prysm (Consensus) manages the Beacon Chain.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <InfoCard label="Chain ID" value="102219" sub="EIP-155" />
                    <InfoCard label="Consensus" value="Gasper" sub="Casper + LMD" />
                </div>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2 font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-center order-1 md:order-2">
                <div className="p-4 md:p-6 bg-[#e2ff3d] text-black font-black transform -skew-x-6 md:-skew-x-12 shadow-[0_0_30px_rgba(226,255,61,0.15)]">User Interface / Dapps</div>
                <div className="p-3 md:p-4 bg-white/10 text-white transform -skew-x-6 md:-skew-x-12 border border-white/10 hover:bg-white/20 transition-colors">Execution Layer (Modified Geth)</div>
                <div className="p-1.5 text-[#e2ff3d] font-bold animate-pulse text-[8px] md:text-[10px]">↑ ENGINE API V3 ↓</div>
                <div className="p-3 md:p-4 bg-white/5 text-gray-500 transform -skew-x-6 md:-skew-x-12 border border-white/5">Consensus Layer (Prysm/Pando)</div>
                <div className="p-4 md:p-6 bg-white/[0.02] text-gray-700 transform -skew-x-6 md:-skew-x-12 border border-white/5 border-dashed">N=256 Parallel Shards</div>
            </div>
        </div>

        {/* DIAGRAM: AAM PROOF FLOW (FROM WP) */}
        <section className="space-y-8 md:space-y-12">
            <h3 className="text-[9px] md:text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em] md:tracking-[0.4em] text-center">Asynchronous Atomic Messaging (AAM)</h3>
            <div className="h-48 md:h-64 border border-white/5 rounded-sm flex items-center justify-around relative overflow-hidden px-4 md:px-8 bg-white/[0.01]">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#e2ff3d]/5 to-transparent" />
                <div className="z-10 text-center space-y-3 md:space-y-4">
                    <div className="w-14 h-14 md:w-20 md:h-20 border border-white/10 bg-[#0a0a0a] flex items-center justify-center font-mono text-[8px] md:text-[9px] rounded-lg group hover:border-[#e2ff3d]/50 transition-colors">SHARD A</div>
                    <p className="text-[7px] md:text-[8px] text-[#e2ff3d] font-bold uppercase">TX SUBMIT</p>
                </div>
                <div className="relative flex-grow h-[1px] bg-white/10 mx-4 md:mx-10">
                    <motion.div
                        initial={{ left: "0%" }}
                        animate={{ left: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 w-3 h-3 md:w-4 md:h-4 bg-[#e2ff3d] rounded-full -translate-y-1/2 -translate-x-1/2 shadow-[0_0_15px_#e2ff3d]"
                    />
                    <p className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] md:text-[10px] uppercase font-mono tracking-widest italic text-white/40 whitespace-nowrap">Atomic State Transition</p>
                </div>
                <div className="z-10 text-center space-y-3 md:space-y-4">
                    <div className="w-14 h-14 md:w-20 md:h-20 border border-white/10 bg-[#0a0a0a] flex items-center justify-center font-mono text-[8px] md:text-[9px] rounded-lg group hover:border-[#eba809]/50 transition-colors">SHARD B</div>
                    <p className="text-[7px] md:text-[8px] text-[#eba809] font-bold uppercase">TX FINALIZED</p>
                </div>
            </div>
        </section>

        {/* DIAGRAM: PORTAL NETWORK SCHEMATIC (FROM WP) */}
        <section className="space-y-12 py-12 border-y border-white/5">
            <div className="text-center space-y-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Portal Network & State Expiry</h3>
                <p className="text-sm text-gray-500 font-serif italic max-w-2xl mx-auto">Decentralized DHT Archival Storage Layer ensuring blockchain lightness over decades.</p>
            </div>
            <div className="flex flex-col items-center gap-10">
                <div className="relative w-48 h-48 md:w-64 md:h-64">
                    <div className="absolute inset-0 border border-dashed border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-3 h-3 bg-white/20 rounded-full border border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                            style={{
                                top: `${50 + 45 * Math.sin(i * Math.PI / 3)}%`,
                                left: `${50 + 45 * Math.cos(i * Math.PI / 3)}%`
                            }}
                        />
                    ))}
                    <div className="absolute inset-x-8 inset-y-8 bg-[#e2ff3d] rounded-full flex items-center justify-center text-black font-mono text-[10px] font-black text-center p-4 shadow-[0_0_40px_rgba(226,255,61,0.15)]">
                        LIVE CHAIN <br /> (STATELESS)
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full mt-8">
                    <div className="text-center p-4 bg-white/5 border border-white/5 rounded-sm">
                        <div className="text-[#e2ff3d] font-bold text-lg">KZG</div>
                        <div className="text-[8px] text-gray-600 uppercase tracking-widest">DAS Proofs</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 border border-white/5 rounded-sm">
                        <div className="text-white font-bold text-lg">5-10Y</div>
                        <div className="text-[8px] text-gray-600 uppercase tracking-widest">Hot Storage</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 border border-white/5 rounded-sm">
                        <div className="text-white font-bold text-lg">DHT</div>
                        <div className="text-[8px] text-gray-600 uppercase tracking-widest">Portal Retrieval</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 border border-white/5 rounded-sm">
                        <div className="text-white font-bold text-lg">-40%</div>
                        <div className="text-[8px] text-gray-600 uppercase tracking-widest">Disk Overhead</div>
                    </div>
                </div>
            </div>
        </section>

        <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Mainnet Governance & Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoCard label="Gas (Base)" value="15 Gwei" sub="50% Burned" />
                <InfoCard label="Governance" value="On-Chain" sub="DAO Managed" />
                <InfoCard label="Block Reward" value="50 ZUG" sub="Halvings" />
                <InfoCard label="EVM Version" value="Cancun" sub="Full Support" />
            </div>
            <CodeBlock
                language="json"
                code={`{
  "rpc": "https://rpc.zugchain.org",
  "wss": "wss://rpc.zugchain.org/ws",
  "explorer": "https://scan.zugchain.org",
  "chainId": 102219,
  "currency": "ZUG"
}`}
            />
        </div>
    </div>
);

const EconomyView = () => {
    const LISTING_PRICE = 0.20;
    const BLOCKS_PER_YEAR = 5_259_600;

    return (
        <div className="space-y-24 pt-8  animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 md:mb-8 font-serif leading-none">
                    Economic <br className="sm:hidden" />
                    <span className="text-[#e2ff3d] italic underline decoration-1 underline-offset-[8px] md:underline-offset-[12px]">Fortress</span>
                </h2>
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left py-8 md:py-12 border-b border-white/5 mb-8 md:mb-12">
                    <div className="p-8 md:p-12 border border-[#e2ff3d]/20 bg-[#e2ff3d]/[0.02] rounded-full relative group shrink-0">
                        <div className="absolute inset-x-0 inset-y-0 border-2 border-dashed border-[#e2ff3d]/20 rounded-full animate-[spin_30s_linear_infinite]" />
                        <div className="space-y-2 relative z-10">
                            <p className="text-white text-xl md:text-3xl font-black font-serif italic tracking-tighter">V = Σ TX_Vol_USD / Supply</p>
                            <p className="text-[#e2ff3d] font-mono text-[8px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.3em]">Network Velocity Formula</p>
                        </div>
                    </div>
                    <p className="text-base md:text-lg text-gray-400 font-serif italic max-w-2xl leading-relaxed">
                        $ZUG is engineered for network utility and capital velocity, anchored by a 1 Billion maximum supply and programmatic fee dynamics. Scarcity is code-enforced.
                    </p>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoCard label="Max Supply" value="1,000,000,000" sub="Hard Capped" />
                <InfoCard label="IDO Price" value="$0.20" sub="Initial Listing" />
                <InfoCard label="TGE Market Cap" value="$24M" sub="At Launch" />
                <InfoCard label="Mining Cap" value="~525M ZUG" sub="Block Rewards" />
            </div>

            {/* 14-STAGE PRESALE VESTING SCHEDULE (NEW) */}
            <section className="space-y-12 py-12 border-y border-white/5">
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Presale Vesting Schedule</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em]">14 Stages · Full Transparency</p>
                </div>
                <div className="overflow-x-auto border border-white/5 rounded-lg bg-[#050505] no-scrollbar">
                    <table className="w-full text-[8px] md:text-[9px] font-mono border-collapse uppercase tracking-tight md:tracking-widest whitespace-nowrap">
                        <thead>
                            <tr className="bg-white/5 text-gray-500 border-b border-white/10 text-left">
                                <th className="p-3 md:p-4">Stage</th>
                                <th className="p-3 md:p-4">Price (USD)</th>
                                <th className="p-3 md:p-4">ROI to $0.20</th>
                                <th className="p-3 md:p-4">TGE</th>
                                <th className="p-3 md:p-4">Cliff</th>
                                <th className="p-3 md:p-4">Vesting</th>
                                <th className="p-3 md:p-4 text-right">Monthly</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-400">
                            {[
                                ["Stage 1", "$0.00012", "166567x", "1%", "6M", "24M", "4.13%"],
                                ["Stage 2", "$0.00024", "83233x", "2%", "6M", "24M", "4.08%"],
                                ["Stage 3", "$0.00048", "41567x", "3%", "6M", "24M", "4.04%"],
                                ["Stage 4", "$0.00096", "20733x", "4%", "6M", "24M", "4.00%"],
                                ["Stage 5", "$0.00100", "19900x", "5%", "6M", "24M", "3.96%"],
                                ["Stage 6", "$0.00200", "9900x", "5%", "3M", "18M", "5.28%"],
                                ["Stage 7", "$0.00400", "4900x", "7%", "3M", "18M", "5.17%"],
                                ["Stage 8", "$0.00800", "2400x", "8%", "3M", "18M", "5.11%"],
                                ["Stage 9", "$0.01000", "1900x", "9%", "3M", "18M", "5.06%"],
                                ["Stage 10", "$0.02000", "900x", "10%", "3M", "18M", "5.00%"],
                                ["Stage 11", "$0.04000", "400x", "15%", "0", "9M", "9.44%"],
                                ["Stage 12", "$0.08000", "150x", "20%", "0", "6M", "13.33%"],
                                ["Stage 13", "$0.10000", "100x", "25%", "0", "6M", "12.50%"],
                                ["Stage 14", "$0.20000", "0x", "35%", "0", "3M", "21.67%"],
                            ].map((row, i) => (
                                <tr key={i} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${i === 13 ? "text-[#e2ff3d] font-black" : ""}`}>
                                    {row.map((cell, j) => (
                                        <td key={j} className={`p-3 md:p-4 ${j === 6 ? "text-right" : ""}`}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-sm">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Vesting Protection</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-serif italic">
                        Early stages (1-5) have 6-month cliffs and 24-month vesting to prevent market dumping. This ensures long-term alignment and protects later buyers from price manipulation.
                    </p>
                </div>
            </section>

            {/* Block Reward Halving Schedule (NEW) */}
            <section className="space-y-12">
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Block Reward Halving Schedule</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em]">Predictable Issuance Model</p>
                </div>

                {/* Halving Highlights Stats Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoCard label="Initial Reward" value="50 ZUG" sub="Year 0-2" />
                    <InfoCard label="Halving Frequency" value="Every 2 Years" sub="Fixed Schedule" />
                    <InfoCard label="Mining Cap" value="~525M ZUG" sub="Total Issuance" />
                    <InfoCard label="Issuance Type" value="Programmatic" sub="Hardcoded" />
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-lg bg-[#050505] no-scrollbar">
                    <table className="w-full text-[9px] md:text-[10px] font-mono border-collapse uppercase tracking-widest whitespace-nowrap">
                        <thead>
                            <tr className="bg-white/5 text-gray-500 border-b border-white/10 text-left">
                                <th className="p-4 md:p-6">Year Range</th>
                                <th className="p-4 md:p-6">Block Reward</th>
                                <th className="p-4 md:p-6 text-right">Annual Issuance</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-400">
                            {[
                                ["Year 0-2", "50 ZUG", "263.0M"],
                                ["Year 2-4", "25 ZUG", "131.5M"],
                                ["Year 4-6", "12.5 ZUG", "65.7M"],
                                ["Year 6-8", "6.25 ZUG", "32.9M"],
                                ["Year 8-10", "3.125 ZUG", "16.4M"],
                                ["Year 10+", "<1.5 ZUG", "Negligible"],
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4 md:p-6 font-bold">{row[0]}</td>
                                    <td className="p-4 md:p-6">{row[1]}</td>
                                    <td className="p-4 md:p-6 text-right">{row[2]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="p-10 border border-white/5 bg-white/[0.01] rounded-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-[2px] h-full bg-[#e2ff3d] opacity-20" />
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 font-mono">Fee Economics</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-serif italic">
                            Base gas fee: 10-15 Gwei. 50% of fees are burned (deflationary), 50% to validators. By Year 10, security transitions fully to fee market.
                        </p>
                    </div>
                </div>
            </section>

            {/* Circulating Supply Projection (NEW) */}
            <section className="space-y-12 py-12 border-y border-white/5">
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Circulating Supply Projection</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em]">Absorption Model (TGE to 48M)</p>
                </div>
                <div className="overflow-x-auto border border-white/5 rounded-lg bg-[#050505]">
                    <table className="w-full text-[10px] font-mono border-collapse uppercase tracking-widest">
                        <thead>
                            <tr className="bg-white/5 text-gray-500 border-b border-white/10 text-left">
                                <th className="p-6">Milestone</th>
                                <th className="p-6">Circulating Supply</th>
                                <th className="p-6 text-right">% of Max Supply</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-400">
                            {[
                                ["TGE (Listing)", "120M ZUG", "12%"],
                                ["Month 6", "185M ZUG", "18.5%"],
                                ["Month 12 (Year 1)", "280M ZUG", "28%"],
                                ["Month 24 (Year 2)", "450M ZUG", "45%"],
                                ["Month 36 (Year 3)", "620M ZUG", "62%"],
                                ["Month 48 (Year 4)", "750M ZUG", "75%"],
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="p-6 font-bold">{row[0]}</td>
                                    <td className="p-6">{row[1]}</td>
                                    <td className="p-6 text-right font-black text-[#e2ff3d]">{row[2]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-10 border border-white/5 bg-white/[0.01] rounded-sm text-center">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 font-mono">Supply Growth Management</h4>
                    <p className="text-[12px] text-gray-500 leading-relaxed font-serif italic max-w-3xl mx-auto">
                        Circulating supply increases gradually due to vesting schedules. At constant market cap, price appreciation is built-in as token unlocks are absorbed by ecosystem growth and validator staking demand.
                    </p>
                </div>
            </section>

            {/* STRATEGIC INVESTMENT TIMELINE (FROM WP) */}
            <section className="space-y-8 md:space-y-12">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-8 md:mb-12">Institutional Launch Timeline</h3>
                <div className="relative py-20 md:py-32 px-4 md:px-12 bg-[#050505] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Background Accents (Atmospheric) */}
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#e2ff3d]/[0.02] to-transparent pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d]/5 to-transparent pointer-events-none" />

                    <div className="relative">
                        {/* Unified Progress Track (Desktop) */}
                        <div className="hidden md:block absolute top-[8px] left-0 w-full h-[1px] bg-white/10" />
                        <div className="hidden md:block absolute top-[8px] left-0 w-[25%] h-[1px] bg-[#e2ff3d] shadow-[0_0_15px_#e2ff3d]/60 z-10" />

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-16 md:gap-4">
                            {/* Step 1: Q4 2025 - COMPLETED */}
                            <div className="relative transition-all duration-700">
                                {/* Precision Node */}
                                <div className="absolute left-[-9px] top-0 md:left-1/2 md:-translate-x-1/2 md:-top-[4px] w-4 h-4 md:w-6 md:h-6 rounded-full border border-[#e2ff3d]/30 bg-[#050505] z-20 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#e2ff3d]" />
                                </div>
                                <div className="pl-8 md:pl-0 md:pt-16 space-y-4">
                                    <div className="flex flex-col md:items-center gap-1">
                                        <p className="text-[#e2ff3d] font-mono text-[9px] font-black tracking-[0.3em] uppercase opacity-70">Q4 2025</p>
                                        <h4 className="text-white text-base font-serif italic font-bold tracking-tight md:text-center">Foundation</h4>
                                    </div>
                                    <div className="md:text-center space-y-3">
                                        <p className="text-[10px] text-gray-600 leading-relaxed font-mono uppercase tracking-tighter">Devnet V1 Deployment | Core Swiss Architecture</p>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2ff3d]/5 border border-[#e2ff3d]/10">
                                            <span className="text-[7px] text-[#e2ff3d] font-black tracking-widest uppercase">Verified Phase</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Q1 2026 - ACTIVE */}
                            <div className="relative group transition-all duration-700">
                                {/* Precision Node - ACTIVE */}
                                <div className="absolute left-[-11px] top-[-2px] md:left-1/2 md:-translate-x-1/2 md:-top-[7px] w-5 h-5 md:w-8 md:h-8 rounded-full border-2 border-[#e2ff3d] bg-black z-30 shadow-[0_0_30px_#e2ff3d] flex items-center justify-center">
                                    <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-[#e2ff3d] animate-pulse" />
                                </div>
                                <div className="pl-8 md:pl-0 md:pt-16 space-y-4">
                                    <div className="flex flex-col md:items-center gap-1">
                                        <p className="text-[#e2ff3d] font-mono text-[10px] font-black tracking-[0.4em] uppercase">Q1 2026</p>
                                        <h4 className="text-white text-lg md:text-xl font-serif italic font-extrabold uppercase tracking-tighter md:text-center underline decoration-[#e2ff3d]/30 underline-offset-8">Public Testnet</h4>
                                    </div>
                                    <div className="bg-white/[0.02] border border-[#e2ff3d]/20 rounded-2xl p-6 relative overflow-hidden group-hover:bg-white/[0.04] transition-colors md:text-center">
                                        {/* Delicate Active Glow */}
                                        <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#e2ff3d]/10 rounded-full blur-2xl" />
                                        <p className="text-[11px] text-[#e2ff3d] leading-relaxed font-mono uppercase tracking-tight relative z-10">16 Parallel Shards Live | $1M Global Bug Bounty</p>
                                        <div className="mt-4 flex items-center md:justify-center gap-2 relative z-10">
                                            <span className="text-[8px] bg-[#e2ff3d] text-black px-2 py-0.5 rounded font-black tracking-[0.2em] animate-pulse uppercase">Active Engine</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Q3 2026 - UPCOMING */}
                            <div className="relative opacity-40 hover:opacity-100 transition-opacity">
                                {/* Node */}
                                <div className="absolute left-[-8px] top-[1px] md:left-1/2 md:-translate-x-1/2 md:-top-[3px] w-3 h-3 md:w-5 md:h-5 rounded-full border border-white/20 bg-[#111] z-20" />
                                <div className="pl-8 md:pl-0 md:pt-16 space-y-4 md:text-center">
                                    <p className="text-white/40 font-mono text-[9px] font-black tracking-[0.2em] uppercase">Q3 2026</p>
                                    <h4 className="text-white/60 text-base font-serif italic font-bold">Mainnet Genesis</h4>
                                    <p className="text-[10px] text-gray-700 leading-relaxed font-mono uppercase">$ZUG TGE | N=256 Validator Set</p>
                                </div>
                            </div>

                            {/* Step 4: Q4 2026 - UPCOMING */}
                            <div className="relative opacity-30 hover:opacity-100 transition-opacity">
                                {/* Node */}
                                <div className="absolute left-[-8px] top-[1px] md:left-1/2 md:-translate-x-1/2 md:-top-[3px] w-3 h-3 md:w-5 md:h-5 rounded-full border border-white/10 bg-[#111] z-20" />
                                <div className="pl-8 md:pl-0 md:pt-16 space-y-4 md:text-center">
                                    <p className="text-white/30 font-mono text-[9px] font-black tracking-[0.2em] uppercase">Q4 2026</p>
                                    <h4 className="text-white/40 text-base font-serif italic font-bold">Staking Phase 1</h4>
                                    <p className="text-[10px] text-gray-800 leading-relaxed font-mono uppercase">Reserve Yield Optimization</p>
                                </div>
                            </div>

                            {/* Step 5: 2027+ - UPCOMING */}
                            <div className="relative opacity-20 hover:opacity-100 transition-opacity">
                                {/* Node */}
                                <div className="absolute left-[-8px] top-[1px] md:left-1/2 md:-translate-x-1/2 md:-top-[3px] w-3 h-3 md:w-5 md:h-5 rounded-full border border-white/5 bg-[#111] z-20" />
                                <div className="pl-8 md:pl-0 md:pt-16 space-y-4 md:text-center">
                                    <p className="text-white/20 font-mono text-[9px] font-black tracking-[0.2em] uppercase">2027+</p>
                                    <h4 className="text-white/20 text-base font-serif italic font-bold">Protocol Zenith</h4>
                                    <p className="text-[10px] text-gray-900 leading-relaxed font-mono uppercase">Institutional Stable State</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="p-8 bg-white/[0.01] border-l-4 border-[#e2ff3d] rounded-r-xl">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">The Deflationary Flywheel</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-4xl italic font-serif">
                    Security transitions from block rewards to fee market by Year 10. 50% fee burning ensures long-term deflationary pressure while validators earn sustainable yields. As network velocity (V) increases, $ZUG scarcity accelerates exponentially.
                </p>
            </div>
        </div>
    );
};

const ValidatorView = () => (
    <div className="space-y-24 animate-in pt-8 fade-in slide-in-from-bottom-4 duration-500">
        <div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-8 flex items-center gap-4 font-serif leading-none">
                Validator Operations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
                <div className="p-6 md:p-8 bg-white/[0.01] border border-white/5 rounded-xl relative overflow-hidden group">
                    <h4 className="text-[11px] md:text-sm font-bold text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2 font-mono">
                        Hardware Requirements
                    </h4>
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-1">
                            <div className="text-[8px] md:text-[9px] text-gray-600 uppercase font-mono">CPU</div>
                            <div className="text-sm md:text-base text-white font-black font-mono">4-8 Cores</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[8px] md:text-[9px] text-gray-600 uppercase font-mono">RAM</div>
                            <div className="text-sm md:text-base text-white font-black font-mono">16GB RAM</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[8px] md:text-[9px] text-gray-600 uppercase font-mono">Disk</div>
                            <div className="text-sm md:text-base text-white font-black font-mono">500GB NVMe</div>
                        </div>
                        <div className="text-[8px] md:text-[9px] text-[#e2ff3d]/60 uppercase font-mono italic mt-4 col-span-2">Stateless execution enabled. Consumer hardware prioritized.</div>
                    </div>
                </div>
                <div className="p-6 md:p-8 bg-[#e2ff3d]/[0.01] border border-[#e2ff3d]/10 rounded-xl relative overflow-hidden group">
                    <h4 className="text-[11px] md:text-sm font-bold text-[#e2ff3d] uppercase tracking-widest mb-6 flex items-center gap-2 font-mono">
                        Staking Protocol
                    </h4>
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex justify-between items-end border-b border-white/5 pb-2">
                            <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-mono">Minimum Stake</span>
                            <span className="text-lg md:text-xl font-black text-white font-mono">32,000 ZUG</span>
                        </div>
                        <p className="text-[10px] md:text-[11px] text-gray-400 font-mono italic leading-relaxed">
                            Validator funds are locked in the Beacon Chain contract. Exit period is approximately 27 hours (5 epochs).
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Adversarial Economics Graph (CoA > PfA) (FROM WP) */}
        <section className="space-y-8 md:space-y-12">
            <div className="text-center space-y-4">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Adversarial Economics (CoA {'>'} PfA)</h3>
                <p className="text-[9px] md:text-sm text-gray-500 font-mono uppercase tracking-[0.1em] md:tracking-[0.2em]">∀t: CoA(t) {'>'} (PfA_base + Systemic_Griefing)(t)</p>
            </div>
            <div className="h-48 md:h-64 border-x border-b border-white/5 p-4 md:p-12 relative flex items-end gap-[1px] md:gap-1 overflow-hidden group bg-gradient-to-t from-white/[0.01] to-transparent">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5" />
                {[...Array(40)].map((_, i) => (
                    <div
                        key={i}
                        className="flex-grow bg-[#e2ff3d] border-t border-white/10 relative transition-all duration-700 hover:brightness-150 hover:z-20"
                        style={{
                            height: `${Math.pow(1.1, i) * 3}%`,
                            opacity: (i / 40) * 0.8 + 0.2,
                            boxShadow: i > 30 ? '0 0 15px rgba(226,255,61,0.15)' : 'none'
                        }}
                    >
                        {i === 35 && <div className="absolute -top-10 md:-top-12 left-1/2 -translate-x-1/2 text-[7px] md:text-[9px] font-mono text-[#e2ff3d] whitespace-nowrap animate-pulse font-black uppercase tracking-[0.2em] md:tracking-[0.3em] bg-black/80 px-2 py-1">EXPONENTIAL COORDINATION COST</div>}
                    </div>
                ))}
                <div className="absolute bottom-6 md:bottom-10 left-6 md:left-12 font-mono text-[7px] md:text-[9px] uppercase tracking-widest text-white/40 font-black z-10">N=256 Coordination Complexity Floor</div>
            </div>
        </section>

        {/* Staking formula breakdown (FROM WP) */}
        <div className="p-8 md:p-16 border border-[#e2ff3d]/20 bg-[#e2ff3d]/[0.02] text-center space-y-8 md:space-y-10 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e2ff3d] to-transparent" />
            <div className="space-y-4">
                <div className="text-white/40 font-mono text-[9px] md:text-[10px] uppercase tracking-widest mb-4">Network Security Budget (SB)</div>
                <div className="text-2xl md:text-5xl font-black text-white font-serif italic tracking-tighter leading-tight">SB = (Fees * 0.3) + Reserve + S_min</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 pt-8 border-t border-white/10 opacity-70">
                <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest">S_min Floor</p>
                    <p className="text-lg md:text-xl font-mono text-white">33.3% Slash</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest">Reserve Buffer</p>
                    <p className="text-lg md:text-xl font-mono text-white">12-Year Bear</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest">Security Type</p>
                    <p className="text-lg md:text-xl font-mono text-[#e2ff3d]">HARDENED</p>
                </div>
            </div>
        </div>

        {/* Validator Installation & Setup (Section 01) */}
        <section className="space-y-6 md:space-y-8 bg-white/[0.01] p-6 md:p-10 border border-white/5 rounded-2xl relative overflow-hidden group transition-all duration-700 hover:border-[#e2ff3d]/20">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2ff3d]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-4 uppercase font-serif italic tracking-tight">
                    <span className="w-8 h-8 bg-[#e2ff3d] text-black rounded-full flex items-center justify-center text-xs font-mono not-italic font-black shadow-[0_0_20px_#e2ff3d]">01</span>
                    Installation & Join
                </h3>
                <span className="self-start text-[9px] md:text-[10px] text-[#e2ff3d] font-mono font-black uppercase tracking-widest border border-[#e2ff3d]/20 px-3 py-1 bg-[#e2ff3d]/5">Automated Setup</span>
            </div>
            <p className="text-gray-400 text-[12px] md:text-[13px] leading-relaxed max-w-2xl font-serif italic">
                Use the institutional automated setup script to generate local keys, initialize the beacon node, and join the global mainnet.
            </p>
            <CodeBlock
                language="bash"
                code={`wget https://raw.githubusercontent.com/zugchain/mainnet/main/scripts/zugchain-external-join-v5.sh
chmod +x zugchain-external-join-v5.sh
./zugchain-external-join-v5.sh`}
            />
        </section>

        {/* Risk & Mitigation (FROM WP) */}
        <section className="space-y-8 md:space-y-12 pt-12 border-t border-white/5">
            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Risk & Mitigation Memorandum</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5 text-[10px] font-mono uppercase">
                <div className="bg-[#050505] p-8 md:p-10 space-y-4 hover:bg-white/[0.02] transition-colors font-serif italic text-white/50">
                    <h4 className="text-white font-black italic">Byzantine Safety</h4>
                    <p className="text-gray-600 leading-relaxed italic">33.3% S_min burn on failure. Attacks are mathematically suicidal at scale.</p>
                </div>
                <div className="bg-[#050505] p-8 md:p-10 space-y-4 hover:bg-white/[0.02] transition-colors">
                    <h4 className="text-white font-black italic">Network Entropy</h4>
                    <p className="text-gray-600 leading-relaxed italic">Anti-correlation penalties deter data center centralization clusters.</p>
                </div>
                <div className="bg-[#050505] p-8 md:p-10 space-y-4 hover:bg-white/[0.02] transition-colors">
                    <h4 className="text-white font-black italic">Finality Risk</h4>
                    <p className="text-gray-600 leading-relaxed italic">Casper FFG ensures deterministic finality within 2–3 epochs max.</p>
                </div>
                <div className="bg-[#050505] p-8 md:p-10 space-y-4 hover:bg-white/[0.02] transition-colors">
                    <h4 className="text-[#e2ff3d] font-black italic">Economic Stability</h4>
                    <p className="text-gray-600 leading-relaxed italic">Dynamic fee market + burning stabilizes capital velocity volatility.</p>
                </div>
            </div>
        </section>

        {/* Validator Management Scripts (Section 02 & 03) */}
        <div className="grid md:grid-cols-2 gap-8">
            <section className="bg-white/[0.01] p-10 border border-white/5 rounded-2xl relative group">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-white flex items-center gap-4 uppercase font-serif italic tracking-tight">
                        <span className="w-7 h-7 bg-white/10 text-white rounded-full flex items-center justify-center text-[11px] font-mono not-italic font-black">02</span>
                        Disaster Recovery
                    </h3>
                    <span className="text-[9px] text-white bg-white/10 border border-white/20 px-3 py-1 uppercase font-black tracking-widest">Emergency Only</span>
                </div>
                <p className="text-gray-500 text-[12px] mb-6 font-serif italic leading-relaxed">Restore a validator on a new machine using your 24-word mnemonic phrase.</p>
                <CodeBlock
                    language="bash"
                    code={`wget https://raw.githubusercontent.com/zugchain/mainnet/main/scripts/zugchain-validator-recovery.sh
chmod +x zugchain-validator-recovery.sh
./zugchain-validator-recovery.sh`}
                />
            </section>

            <section className="bg-white/[0.01] p-10 border border-white/5 rounded-2xl relative group">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-white flex items-center gap-4 uppercase font-serif italic tracking-tight">
                        <span className="w-7 h-7 bg-white/10 text-white rounded-full flex items-center justify-center text-[11px] font-mono not-italic font-black">03</span>
                        Voluntary Exit
                    </h3>
                    <span className="text-[9px] text-white/40 bg-white/5 border border-white/10 px-3 py-1 uppercase font-black tracking-widest">Irreversible</span>
                </div>
                <p className="text-gray-500 text-[12px] mb-6 font-serif italic leading-relaxed">Signal the beacon chain to withdraw your stake. Funds returned after ~27 hours.</p>
                <CodeBlock
                    language="bash"
                    code={`wget https://raw.githubusercontent.com/zugchain/mainnet/main/scripts/zugchain-validator-exit.sh
chmod +x zugchain-validator-exit.sh
./zugchain-validator-exit.sh`}
                />
            </section>
        </div>

        {/* Deposit Contract Block (NEW) */}
        <div className="p-6 md:p-10 bg-white/[0.01] border border-white/5 rounded-xl space-y-6">
            <div className="flex items-center gap-3 opacity-40">
                <span className="w-6 h-[1px] bg-[#e2ff3d]" />
                <span className="text-mono text-[8px] md:text-[9px] font-black tracking-[0.3em] md:tracking-[0.4em] uppercase font-mono text-[#e2ff3d]">On-Chain Genesis Root</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h4 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter font-serif">Deposit Contract Address</h4>
                    <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest font-mono mt-1">Institutional HEX Identifier</p>
                </div>
                <div className="p-4 md:p-6 bg-[#050505] border border-white/10 rounded-sm group relative cursor-pointer hover:border-[#e2ff3d]/40 transition-all overflow-hidden">
                    <p className="text-[#e2ff3d] font-mono text-[11px] md:text-[13px] font-black tracking-widest break-all select-all">0x00000000219ab540356cBB839Cbe05303d7705Fa</p>
                    <div className="absolute top-0 right-0 px-2 py-1 bg-[#e2ff3d] text-black text-[8px] font-black uppercase tracking-tighter shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">Copy HEX</div>
                </div>
            </div>
        </div>
    </div>
);

const SECTIONS = [
    { id: "intro", title: "Introduction" },
    { id: "arch", title: "Architecture" },
    { id: "econ", title: "Economic Model" },
    { id: "val", title: "Validator Guide" }
];

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("intro");

    const CurrentComponent = () => {
        switch (activeSection) {
            case "intro": return <IntroView />;
            case "arch": return <ArchitectureView />;
            case "econ": return <EconomyView />;
            case "val": return <ValidatorView />;
            default: return <IntroView />;
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#e2ff3d] selection:text-black font-sans">
            <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-12">
                {/* Navigation Tabs (Sticky) */}
                <div className="sticky top-0 bg-[#050505] z-[100]">
                    <div className="flex items-center gap-4 md:gap-12 overflow-x-auto pb-4 pt-16 no-scrollbar">
                        {SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`flex items-center gap-3 px-0 py-2 text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-mono transition-all whitespace-nowrap relative group ${activeSection === section.id
                                    ? "text-[#e2ff3d] font-black"
                                    : "text-gray-600 hover:text-white"
                                    }`}
                            >
                                {section.title}
                                {activeSection === section.id && (
                                    <motion.div layoutId="activeTab" className="absolute -bottom-[1px] left-0 w-full h-[1px] bg-[#e2ff3d] shadow-[0_0_15px_#e2ff3d]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="relative min-h-[800px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            {CurrentComponent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
