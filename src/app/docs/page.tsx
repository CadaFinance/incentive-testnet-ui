"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        <div className="relative group mt-4 mb-6 rounded-2xl overflow-hidden border border-white/10 bg-[#030303]/80 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-3 bg-white/[0.03] border-b border-white/5">
                <span className="text-[10px] font-mono text-white/40 uppercase font-bold tracking-wider">{language}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white transition-colors"
                >
                    <span className="font-mono uppercase underline decoration-[#e2ff3d]/50 underline-offset-2">{copied ? "COPIED" : "COPY"}</span>
                </button>
            </div>
            <div className="p-6 overflow-x-auto custom-scrollbar">
                <pre className="text-xs font-mono text-white/80 leading-relaxed whitespace-pre-wrap break-all sm:break-normal selection:bg-[#e2ff3d]/20 selection:text-[#e2ff3d]">
                    {code}
                </pre>
            </div>
        </div>
    );
};

const InfoCard = ({ label, value, sub }: { label: string, value: string, sub?: string }) => (
    <div className="p-6 bg-white/[0.02] border border-white/10 hover:border-[#e2ff3d]/30 transition-all duration-500 rounded-2xl group relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-[2px] h-0 bg-[#e2ff3d] group-hover:h-full transition-all duration-500" />
        <div className="text-[9px] font-mono text-white/40 uppercase tracking-[0.2em] mb-3 group-hover:text-[#e2ff3d] transition-colors">{label}</div>
        <div className="text-xl font-black text-white font-mono break-all tracking-tighter">{value}</div>
        {sub && <div className="text-[10px] text-white/30 mt-2 font-mono uppercase tracking-wide">{sub}</div>}
    </div>
);

// --- Section Views ---

const IntroView = () => (
    <div className="space-y-24 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">

        {/* Why ZugChain Competes with Enterprise L1s */}
        <section className="space-y-16">
            <div className="max-w-3xl">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 md:mb-6 text-white leading-none">
                    Why ZugChain Competes with <br className="sm:hidden" />
                    <span className="text-[#e2ff3d]">Enterprise L1s</span>
                </h2>
                <p className="text-white/60 text-base md:text-lg leading-relaxed font-light">
                    ZugChain eliminates the trade-offs of legacy blockchains by providing institutional-grade transparency, permissionless security, and seamless developer onboarding.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        title: "Transparent Economics",
                        desc: "Unlike competitors with opaque token distributions, every ZUG allocation is public, verifiable, and governed by immutable smart contracts."
                    },
                    {
                        title: "True Decentralization",
                        desc: "Anyone with 32,000 ZUG can run a validator. No permissioned validator sets, no central authorities controlling block production."
                    },
                    {
                        title: "Developer Experience",
                        desc: "Deploy your existing Ethereum dApps with zero modifications. Full Solidity support, Web3.js, Ethers.js, Hardhat, Foundry support out of the box."
                    },
                    {
                        title: "Sustainable Security",
                        desc: "Security transitions from block rewards to fee market by Year 10. 50% fee burning ensures long-term deflationary pressure."
                    }
                ].map((item, i) => (
                    <div key={i} className="bg-white/[0.02] backdrop-blur-sm border border-white/10 p-8 rounded-3xl space-y-4 hover:bg-white/[0.04] hover:border-white/20 transition-all group">
                        <div className="text-[10px] font-mono text-[#e2ff3d] opacity-40 group-hover:opacity-100 transition-opacity">0{i + 1}</div>
                        <h4 className="text-white font-black uppercase tracking-tight text-lg">{item.title}</h4>
                        <p className="text-white/40 text-[11px] md:text-xs leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
                {
                    id: "01",
                    title: "Bitcoin Economics",
                    subtitle: "Verifiable Scarcity",
                    desc: "Hard-capped at 1 billion tokens with programmatic halving every 2 years. Zero central bank manipulation, zero arbitrary minting.",
                    points: ["50 ZUG block reward with predictable halving schedule", "Deflationary fee burning mechanism (50% burned)"]
                },
                {
                    id: "02",
                    title: "Ethereum Security",
                    subtitle: "Battle-Tested Security",
                    desc: "Powered by Prysm Beacon Chain and Geth—the same battle-tested clients securing billions in Ethereum. Proof-of-Stake consensus.",
                    points: ["Sub-6 second block times with deterministic finality", "Full EVM compatibility—deploy Solidity contracts instantly"]
                },
                {
                    id: "03",
                    title: "N=256 Scalability",
                    subtitle: "Vertical Sharding",
                    desc: "Parallel transaction streams across 256 shards. Target throughput exceeds 100,000+ real-world TPS with sub-2s latency.",
                    points: ["Asynchronous Atomic Messaging (AAM) for cross-shard TX", "Stateless execution for consumer-grade validation"]
                }
            ].map((pillar, i) => (
                <div key={i} className={`relative overflow-hidden p-8 bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl group hover:border-[#e2ff3d]/30 transition-all duration-500 ${i === 2 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
                    <div className="relative z-10">
                        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3 leading-tight">
                            <span className="text-white/20 font-mono text-sm">{pillar.id}</span> {pillar.title}
                        </h3>
                        <p className="text-[11px] md:text-sm text-[#e2ff3d] font-mono mb-4 uppercase tracking-widest font-bold">
                            {pillar.subtitle}
                        </p>
                        <p className="text-white/60 leading-relaxed text-[13px] md:text-sm mb-6">
                            {pillar.desc}
                        </p>
                        <ul className="space-y-3 text-[9px] md:text-[10px] text-white/40 font-mono uppercase tracking-wider">
                            {pillar.points.map((point, j) => (
                                <li key={j} className="flex items-start gap-3">
                                    <span className="text-[#e2ff3d] shrink-0">/</span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>

        {/* Scalability Diagram */}
        <section className="space-y-8">
            <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-[0.4em] text-center">Vertical Sharding Scalability (N=256)</h3>
            <div className="p-12 border border-white/10 bg-white/[0.01] rounded-3xl relative overflow-hidden group backdrop-blur-sm">
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3 opacity-60">
                    {[...Array(32)].map((_, i) => (
                        <div key={i} className="aspect-square bg-white/5 border border-white/10 rounded-lg group-hover:bg-[#e2ff3d]/20 transition-all duration-700 hover:scale-110" style={{ transitionDelay: `${i * 10}ms` }} />
                    ))}
                </div>
                <div className="mt-10 flex flex-col items-center gap-4">
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#e2ff3d]/50 to-transparent" />
                    <p className="text-[10px] font-mono text-[#e2ff3d] tracking-widest uppercase">Target: 100,000+ TPS | Latency: {'<'} 2s Cross-Shard</p>
                </div>
            </div>
        </section>

        {/* Paradigm Comparison */}
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/10 p-10 space-y-6 rounded-3xl backdrop-blur-sm">
                <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/40 mb-4">Old Paradigm: Monolithic</p>
                <div className="w-full h-32 bg-white/5 rounded-2xl flex items-center justify-center relative border border-white/5">
                    <div className="w-12 h-12 bg-white/10 rounded-full animate-pulse border border-white/10" />
                </div>
                <p className="text-[10px] text-center text-white/40 uppercase tracking-widest">Serial Processing / Bottlenecking</p>
            </div>
            <div className="bg-gradient-to-br from-[#e2ff3d]/[0.05] to-transparent border border-[#e2ff3d]/20 p-10 space-y-6 relative overflow-hidden rounded-3xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#e2ff3d]/10 blur-[40px]" />
                <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#e2ff3d] mb-4">ZugChain Paradigm: Vertical Sharding</p>
                <div className="w-full h-32 flex items-center justify-around">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1.5 h-full bg-[#e2ff3d]/20 rounded-full relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-4 bg-[#e2ff3d] animate-bounce shadow-[0_0_10px_#e2ff3d]" style={{ animationDelay: `${i * 150}ms`, animationDuration: '2s' }} />
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-center text-white/60 uppercase tracking-widest">Parallel Execution Across N=256</p>
            </div>
        </div>

        {/* Stats Banner */}
        <div className="relative overflow-hidden p-8 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-md">
            <div className="grid md:grid-cols-4 gap-8 divide-x divide-white/10">
                <div className="text-center px-4">
                    <div className="text-4xl font-black text-[#e2ff3d] mb-2 tracking-tighter">6s</div>
                    <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Block Time</div>
                </div>
                <div className="text-center px-4">
                    <div className="text-4xl font-black text-white mb-2 tracking-tighter">1B</div>
                    <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Max Supply</div>
                </div>
                <div className="text-center px-4">
                    <div className="text-4xl font-black text-white/60 mb-2 tracking-tighter">32K</div>
                    <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Validator Stake</div>
                </div>
                <div className="text-center px-4">
                    <div className="text-4xl font-black text-white mb-2 tracking-tighter">N=256</div>
                    <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Shard Count</div>
                </div>
            </div>
        </div>
    </div>
);

const ArchitectureView = () => (
    <div className="space-y-24 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 md:mb-6 text-white leading-none">
                Modular Hybridism
            </h2>
            <p className="text-white/60 max-w-2xl text-base md:text-lg leading-relaxed mb-8 border-l-2 border-[#e2ff3d] pl-6 md:pl-8 font-light">
                Separation of Concerns: Geth handles execution isolation while Prysm/Gesper orchestrates decentralized global consensus via Engine API v3.
            </p>
        </div>

        {/* Architecture Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center py-6 md:py-12 bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12">
            <div className="space-y-6 md:space-y-8 order-2 md:order-1">
                <div className="space-y-4">
                    <h4 className="text-[#e2ff3d] text-[10px] md:text-xs font-bold uppercase tracking-widest py-2 border-b border-[#e2ff3d]/30 inline-block font-mono">Core Protocol Stack</h4>
                    <p className="text-[11px] md:text-[12px] text-white/60 leading-relaxed font-mono">
                        ZugChain decouples the execution layer from consensus. Geth (Execution) is optimized with a path-based flat DB, reducing storage overhead by 40%, while Prysm (Consensus) manages the Beacon Chain.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <InfoCard label="Chain ID" value="102219" sub="EIP-155" />
                    <InfoCard label="Consensus" value="Gasper" sub="Casper + LMD" />
                </div>
            </div>
            <div className="flex flex-col gap-2 font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-center order-1 md:order-2">
                <div className="p-4 md:p-6 bg-[#e2ff3d] text-black font-black transform -skew-x-6 rounded-lg shadow-[0_0_30px_rgba(226,255,61,0.2)]">User Interface / Dapps</div>
                <div className="p-3 md:p-4 bg-white/10 text-white transform -skew-x-6 border border-white/10 rounded-lg backdrop-blur-sm">Execution Layer (Modified Geth)</div>
                <div className="p-1.5 text-[#e2ff3d] font-bold animate-pulse text-[8px] md:text-[10px]">↑ ENGINE API V3 ↓</div>
                <div className="p-3 md:p-4 bg-white/5 text-white/40 transform -skew-x-6 border border-white/5 rounded-lg">Consensus Layer (Prysm/Pando)</div>
                <div className="p-4 md:p-6 bg-white/[0.02] text-white/20 transform -skew-x-6 border border-white/5 border-dashed rounded-lg">N=256 Parallel Shards</div>
            </div>
        </div>

        {/* AAM Proof Flow */}
        <section className="space-y-8 md:space-y-12">
            <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-[0.4em] text-center">Asynchronous Atomic Messaging (AAM)</h3>
            <div className="h-48 md:h-64 border border-white/10 rounded-3xl flex items-center justify-around relative overflow-hidden px-4 md:px-8 bg-white/[0.01]">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#e2ff3d]/5 to-transparent" />
                <div className="z-10 text-center space-y-3 md:space-y-4">
                    <div className="w-14 h-14 md:w-20 md:h-20 border border-white/10 bg-[#0a0a0a] flex items-center justify-center font-mono text-[8px] md:text-[9px] rounded-2xl group hover:border-[#e2ff3d]/50 transition-colors text-white">SHARD A</div>
                    <p className="text-[7px] md:text-[8px] text-[#e2ff3d] font-bold uppercase tracking-wider">TX Submit</p>
                </div>
                <div className="relative flex-grow h-[1px] bg-white/10 mx-4 md:mx-10">
                    <motion.div
                        initial={{ left: "0%" }}
                        animate={{ left: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 w-3 h-3 md:w-4 md:h-4 bg-[#e2ff3d] rounded-full -translate-y-1/2 -translate-x-1/2 shadow-[0_0_15px_#e2ff3d]"
                    />
                    <p className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] md:text-[10px] uppercase font-mono tracking-widest text-white/40 whitespace-nowrap">Atomic State Transition</p>
                </div>
                <div className="z-10 text-center space-y-3 md:space-y-4">
                    <div className="w-14 h-14 md:w-20 md:h-20 border border-white/10 bg-[#0a0a0a] flex items-center justify-center font-mono text-[8px] md:text-[9px] rounded-2xl group hover:border-[#eba809]/50 transition-colors text-white">SHARD B</div>
                    <p className="text-[7px] md:text-[8px] text-[#eba809] font-bold uppercase tracking-wider">TX Finalized</p>
                </div>
            </div>
        </section>

        {/* Portal Network */}
        <section className="space-y-12 py-12">
            <div className="text-center space-y-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Portal Network & State Expiry</h3>
                <p className="text-sm text-white/50 font-light max-w-2xl mx-auto">Decentralized DHT Archival Storage Layer ensuring blockchain lightness over decades.</p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-12 relative overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="text-center p-6 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                        <div className="text-[#e2ff3d] font-bold text-lg font-mono">KZG</div>
                        <div className="text-[9px] text-white/40 uppercase tracking-widest mt-1">DAS Proofs</div>
                    </div>
                    <div className="text-center p-6 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                        <div className="text-white font-bold text-lg font-mono">5-10Y</div>
                        <div className="text-[9px] text-white/40 uppercase tracking-widest mt-1">Hot Storage</div>
                    </div>
                    <div className="text-center p-6 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                        <div className="text-white font-bold text-lg font-mono">DHT</div>
                        <div className="text-[9px] text-white/40 uppercase tracking-widest mt-1">Portal Retrieval</div>
                    </div>
                    <div className="text-center p-6 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                        <div className="text-white font-bold text-lg font-mono">-40%</div>
                        <div className="text-[9px] text-white/40 uppercase tracking-widest mt-1">Disk Overhead</div>
                    </div>
                </div>
            </div>
        </section>

        <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-4 mb-6">Mainnet Governance & Parameters</h3>
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
    return (
        <div className="space-y-24 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 md:mb-8 text-white leading-none">
                    Economic <br className="sm:hidden" />
                    <span className="text-[#e2ff3d] underline decoration-1 underline-offset-[8px] md:underline-offset-[12px]">Fortress</span>
                </h2>
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left py-8 md:py-12 border-b border-white/10 mb-8 md:mb-12">
                    <div className="p-8 md:p-12 border border-[#e2ff3d]/20 bg-[#e2ff3d]/[0.05] rounded-full relative group shrink-0 backdrop-blur-sm">
                        <div className="absolute inset-x-0 inset-y-0 border-2 border-dashed border-[#e2ff3d]/20 rounded-full animate-[spin_30s_linear_infinite]" />
                        <div className="space-y-2 relative z-10">
                            <p className="text-white text-xl md:text-3xl font-black font-mono tracking-tighter">V = Σ TX / S</p>
                            <p className="text-[#e2ff3d] font-mono text-[8px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.3em]">Velocity Formula</p>
                        </div>
                    </div>
                    <p className="text-base md:text-lg text-white/60 font-light max-w-2xl leading-relaxed">
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

            {/* Vesting Table */}
            <section className="space-y-12 py-12">
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Presale Vesting Schedule</h3>
                    <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.4em]">14 Stages · Full Transparency</p>
                </div>
                <div className="overflow-x-auto border border-white/10 rounded-2xl bg-[#030303]/50 backdrop-blur-md no-scrollbar">
                    <table className="w-full text-[9px] md:text-[10px] font-mono border-collapse uppercase tracking-widest whitespace-nowrap">
                        <thead>
                            <tr className="bg-white/5 text-white/40 border-b border-white/10 text-left">
                                <th className="p-4 md:p-6">Stage</th>
                                <th className="p-4 md:p-6">Price (USD)</th>
                                <th className="p-4 md:p-6">ROI to $0.20</th>
                                <th className="p-4 md:p-6">TGE</th>
                                <th className="p-4 md:p-6">Cliff</th>
                                <th className="p-4 md:p-6">Vesting</th>
                                <th className="p-4 md:p-6 text-right">Monthly</th>
                            </tr>
                        </thead>
                        <tbody className="text-white/70">
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
                                <tr key={i} className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors ${i === 13 ? "text-[#e2ff3d] font-black" : ""}`}>
                                    {row.map((cell, j) => (
                                        <td key={j} className={`p-4 md:p-5 ${j === 6 ? "text-right" : ""}`}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-sm">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 font-mono">Vesting Protection</h4>
                    <p className="text-[12px] text-white/50 leading-relaxed font-light">
                        Early stages (1-5) have 6-month cliffs and 24-month vesting to prevent market dumping. This ensures long-term alignment and protects later buyers from price manipulation.
                    </p>
                </div>
            </section>

            {/* Halving Schedule */}
            <section className="space-y-12">
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Block Reward Halving</h3>
                    <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.4em]">Predictable Issuance Model</p>
                </div>

                <div className="overflow-x-auto border border-white/10 rounded-2xl bg-[#030303]/50 backdrop-blur-md no-scrollbar">
                    <table className="w-full text-[10px] font-mono border-collapse uppercase tracking-widest whitespace-nowrap">
                        <thead>
                            <tr className="bg-white/5 text-white/40 border-b border-white/10 text-left">
                                <th className="p-6">Year Range</th>
                                <th className="p-6">Block Reward</th>
                                <th className="p-6 text-right">Annual Issuance</th>
                            </tr>
                        </thead>
                        <tbody className="text-white/70">
                            {[
                                ["Year 0-2", "50 ZUG", "263.0M"],
                                ["Year 2-4", "25 ZUG", "131.5M"],
                                ["Year 4-6", "12.5 ZUG", "65.7M"],
                                ["Year 6-8", "6.25 ZUG", "32.9M"],
                                ["Year 8-10", "3.125 ZUG", "16.4M"],
                                ["Year 10+", "<1.5 ZUG", "Negligible"],
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                                    <td className="p-6 font-bold">{row[0]}</td>
                                    <td className="p-6">{row[1]}</td>
                                    <td className="p-6 text-right">{row[2]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Supply Projection */}
            <section className="space-y-12 py-12 border-t border-white/10">
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Circulating Supply Projection</h3>
                    <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.4em]">Absorption Model</p>
                </div>
                <div className="overflow-x-auto border border-white/10 rounded-2xl bg-[#030303]/50 backdrop-blur-md">
                    <table className="w-full text-[10px] font-mono border-collapse uppercase tracking-widest">
                        <thead>
                            <tr className="bg-white/5 text-white/40 border-b border-white/10 text-left">
                                <th className="p-6">Milestone</th>
                                <th className="p-6">Circulating Supply</th>
                                <th className="p-6 text-right">% of Max Supply</th>
                            </tr>
                        </thead>
                        <tbody className="text-white/70">
                            {[
                                ["TGE (Listing)", "120M ZUG", "12%"],
                                ["Month 6", "185M ZUG", "18.5%"],
                                ["Month 12 (Year 1)", "280M ZUG", "28%"],
                                ["Month 24 (Year 2)", "450M ZUG", "45%"],
                                ["Month 36 (Year 3)", "620M ZUG", "62%"],
                                ["Month 48 (Year 4)", "750M ZUG", "75%"],
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                                    <td className="p-6 font-bold">{row[0]}</td>
                                    <td className="p-6">{row[1]}</td>
                                    <td className="p-6 text-right font-black text-[#e2ff3d]">{row[2]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

const ValidatorView = () => (
    <div className="space-y-24 animate-in pt-8 fade-in slide-in-from-bottom-4 duration-500">
        <div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-8 flex items-center gap-4 text-white leading-none">
                Validator Operations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
                <div className="p-8 bg-white/[0.02] border border-white/10 rounded-3xl relative overflow-hidden group backdrop-blur-sm">
                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2 font-mono">
                        Hardware Requirements
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <div className="text-[9px] text-white/30 uppercase font-mono tracking-wider">CPU</div>
                            <div className="text-base text-white font-black font-mono">4-8 Cores</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[9px] text-white/30 uppercase font-mono tracking-wider">RAM</div>
                            <div className="text-base text-white font-black font-mono">16GB RAM</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[9px] text-white/30 uppercase font-mono tracking-wider">Disk</div>
                            <div className="text-base text-white font-black font-mono">500GB NVMe</div>
                        </div>
                        <div className="text-[9px] text-[#e2ff3d]/60 uppercase font-mono mt-4 col-span-2">Stateless execution enabled. Consumer hardware prioritized.</div>
                    </div>
                </div>
                <div className="p-8 bg-[#e2ff3d]/[0.02] border border-[#e2ff3d]/20 rounded-3xl relative overflow-hidden group backdrop-blur-sm">
                    <h4 className="text-xs font-bold text-[#e2ff3d] uppercase tracking-widest mb-6 flex items-center gap-2 font-mono">
                        Staking Protocol
                    </h4>
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                            <span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Minimum Stake</span>
                            <span className="text-2xl font-black text-white font-mono">32,000 ZUG</span>
                        </div>
                        <p className="text-[11px] text-white/50 font-mono leading-relaxed">
                            Validator funds are locked in the Beacon Chain contract. Exit period is approximately 27 hours (5 epochs).
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Adversarial Economics */}
        <section className="space-y-12">
            <div className="text-center space-y-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Adversarial Economics</h3>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em] break-all">CoA(t) {'>'} (PfA_base + Systemic_Griefing)(t)</p>
            </div>

            {/* Visual Graph Area */}
            <div className="h-64 border-x border-b border-white/10 p-4 md:p-12 relative flex items-end gap-1 overflow-hidden group bg-gradient-to-t from-white/[0.02] to-transparent rounded-b-3xl">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5" />
                {[...Array(40)].map((_, i) => (
                    <div
                        key={i}
                        className="flex-grow bg-[#e2ff3d] border-t border-white/10 relative transition-all duration-700 hover:brightness-150 hover:z-20 rounded-t-sm"
                        style={{
                            height: `${Math.pow(1.1, i) * 3}%`,
                            opacity: (i / 40) * 0.8 + 0.2,
                            boxShadow: i > 30 ? '0 0 15px rgba(226,255,61,0.15)' : 'none'
                        }}
                    >
                        {i === 35 && <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#e2ff3d] whitespace-nowrap animate-pulse font-black uppercase tracking-[0.2em] bg-black/80 px-3 py-1 rounded">Exp. Cost</div>}
                    </div>
                ))}
            </div>

            <div className="p-10 border border-[#e2ff3d]/20 bg-[#e2ff3d]/[0.02] text-center space-y-8 rounded-3xl relative overflow-hidden backdrop-blur-sm">
                <div className="space-y-4">
                    <div className="text-[#e2ff3d]/60 font-mono text-[10px] uppercase tracking-widest mb-2">Network Security Budget (SB)</div>
                    <div className="text-2xl md:text-5xl font-black text-white tracking-tighter leading-tight font-sans">SB = (Fees * 0.3) + Reserve + S_min</div>
                </div>
            </div>
        </section>

        {/* Installation */}
        <section className="bg-white/[0.02] p-8 md:p-10 border border-white/10 rounded-3xl relative overflow-hidden group backdrop-blur-sm transition-all hover:border-[#e2ff3d]/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-4 uppercase tracking-tight">
                    <span className="w-8 h-8 bg-[#e2ff3d] text-black rounded-full flex items-center justify-center text-xs font-mono font-black shadow-[0_0_20px_rgba(226,255,61,0.2)]">01</span>
                    Installation & Join
                </h3>
                <span className="self-start text-[9px] text-[#e2ff3d] font-mono font-black uppercase tracking-widest border border-[#e2ff3d]/20 px-3 py-1 bg-[#e2ff3d]/5 rounded-full">Automated Setup</span>
            </div>
            <p className="text-white/60 text-[13px] leading-relaxed max-w-2xl mb-6">
                Use the institutional automated setup script to generate local keys, initialize the beacon node, and join the global mainnet.
            </p>
            <CodeBlock
                language="bash"
                code={`wget https://raw.githubusercontent.com/zugchain/mainnet/main/scripts/zugchain-external-join-v5.sh
chmod +x zugchain-external-join-v5.sh
./zugchain-external-join-v5.sh`}
            />
        </section>

        {/* Validator Management Scripts */}
        <div className="grid md:grid-cols-2 gap-8">
            <section className="bg-white/[0.02] p-8 border border-white/10 rounded-3xl relative backdrop-blur-sm hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-white flex items-center gap-4 uppercase tracking-tight">
                        <span className="w-7 h-7 bg-white/10 text-white rounded-full flex items-center justify-center text-[11px] font-mono font-black">02</span>
                        Recovery
                    </h3>
                    <span className="text-[9px] text-white/60 bg-white/5 border border-white/10 px-3 py-1 uppercase font-black tracking-widest rounded-full">Emergency</span>
                </div>
                <p className="text-white/50 text-xs mb-6 leading-relaxed">Restore a validator on a new machine using your 24-word mnemonic phrase.</p>
                <CodeBlock
                    language="bash"
                    code={`wget https://raw.githubusercontent.com/zugchain/mainnet/main/scripts/zugchain-validator-recovery.sh
chmod +x zugchain-validator-recovery.sh
./zugchain-validator-recovery.sh`}
                />
            </section>

            <section className="bg-white/[0.02] p-8 border border-white/10 rounded-3xl relative backdrop-blur-sm hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-white flex items-center gap-4 uppercase tracking-tight">
                        <span className="w-7 h-7 bg-white/10 text-white rounded-full flex items-center justify-center text-[11px] font-mono font-black">03</span>
                        Voluntary Exit
                    </h3>
                    <span className="text-[9px] text-[#ff3d3d] bg-[#ff3d3d]/10 border border-[#ff3d3d]/20 px-3 py-1 uppercase font-black tracking-widest rounded-full">Irreversible</span>
                </div>
                <p className="text-white/50 text-xs mb-6 leading-relaxed">Signal the beacon chain to withdraw your stake. Funds returned after ~27 hours.</p>
                <CodeBlock
                    language="bash"
                    code={`wget https://raw.githubusercontent.com/zugchain/mainnet/main/scripts/zugchain-validator-exit.sh
chmod +x zugchain-validator-exit.sh
./zugchain-validator-exit.sh`}
                />
            </section>
        </div>

        {/* Deposit Contract */}
        <div className="p-8 md:p-10 bg-white/[0.02] border border-white/10 rounded-3xl space-y-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 opacity-40">
                <span className="w-6 h-[2px] bg-[#e2ff3d]" />
                <span className="text-mono text-[9px] font-black tracking-[0.3em] uppercase font-mono text-[#e2ff3d]">On-Chain Genesis Root</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h4 className="text-lg font-black text-white uppercase tracking-tighter">Deposit Contract Address</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mt-1">Institutional HEX Identifier</p>
                </div>
                <div className="p-4 bg-[#050505]/50 border border-white/10 rounded-xl group relative cursor-pointer hover:border-[#e2ff3d]/40 transition-all overflow-hidden">
                    <p className="text-[#e2ff3d] font-mono text-xs md:text-sm font-black tracking-widest break-all select-all">0x00000000219ab540356cBB839Cbe05303d7705Fa</p>
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
        <div className="min-h-screen bg-transparent text-white selection:bg-[#e2ff3d] selection:text-black font-sans">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.05] via-transparent to-transparent pointer-events-none" />

            <main className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                        Protocol <span className="text-[#e2ff3d]">Documentation</span>
                    </h1>
                    <p className="text-white/40 font-mono uppercase tracking-[0.2em] text-xs md:text-sm">
                        Technical Architecture & Economic Specifications
                    </p>
                </div>

                {/* Navigation Tabs (Sticky) */}
                <div className="sticky top-17 z-40 mb-12">
                    <div className="flex justify-center">
                        <div className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar shadow-2xl">
                            {SECTIONS.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`px-4 py-2 text-[10px] md:text-xs uppercase tracking-widest font-bold rounded-full transition-all whitespace-nowrap ${activeSection === section.id
                                        ? "bg-[#e2ff3d] text-black shadow-[0_0_20px_rgba(226,255,61,0.3)]"
                                        : "text-white/40 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="relative min-h-[800px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                            transition={{ duration: 0.3 }}
                        >
                            {CurrentComponent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
