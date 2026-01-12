'use client'

import { motion } from 'framer-motion'
import { Twitter, Github, MessageCircle, BookOpen, FileText, Shield, Code, Zap, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const footerLinks = {
    product: [
        { name: 'Whitepaper', href: '/zugwhitepaper.pdf', external: true },
        { name: 'Block Explorer', href: 'https://scan.zugchain.org', external: true },
        { name: 'Documentation', href: 'https://docs.zugchain.org', external: true },
        { name: 'Staking Portal', href: '/staking', external: false },
    ],
    developers: [
        { name: 'GitHub', href: 'https://github.com/zugchain', external: true },
        { name: 'Developer Docs', href: 'https://docs.zugchain.org/developers', external: true },
        { name: 'Testnet Faucet', href: 'https://faucet.zugchain.org', external: true },
        { name: 'Smart Contracts', href: 'https://github.com/zugchain/contracts', external: true },
    ],
    network: [
        { name: 'Validator Setup', href: 'https://docs.zugchain.org/validators', external: true },
        { name: 'Network Stats', href: 'https://stats.zugchain.org', external: true },
        { name: 'Airdrop Program', href: '/Airdrop', external: false },
        { name: 'Boost Rewards', href: '/boost', external: false },
    ],
    company: [
        { name: 'About ZUG Chain', href: '/#about', external: false },
        { name: 'Tokenomics', href: '/#tokenomics', external: false },
        { name: 'FAQ', href: '/#faq', external: false },
        { name: 'Contact', href: '/Airdrop', external: false },
    ]
};

const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/zugchain', color: '#1DA1F2' },
    { name: 'Discord', icon: MessageCircle, href: 'https://discord.gg/zugchain', color: '#5865F2' },
    { name: 'GitHub', icon: Github, href: 'https://github.com/zugchain', color: '#ffffff' },
    { name: 'Telegram', icon: Zap, href: 'https://t.me/zugchain', color: '#0088cc' },
];

const networkSpecs = [
    { label: 'Chain ID', value: '102219' },
    { label: 'Block Time', value: '6s' },
    { label: 'Consensus', value: 'PoS' },
    { label: 'Currency', value: 'ZUG' },
];

export default function Footer() {
    return (
        <footer className="relative overflow-hidden bg-[#020202] border-t border-white/5 blueprint-grid-fine">
            {/* Background Effects */}
            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">

                {/* Main Footer Content */}
                <div className="py-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-16">

                    {/* Brand Section */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <img
                                    src="/logo_text_dark.png"
                                    alt="ZUG_CHAIN"
                                    className="h-6 w-auto object-contain"
                                />
                            </div>

                            <p className="text-gray-500 text-sm font-light leading-relaxed mb-10 max-w-sm">
                                Hybrid Layer 1 architectural framework. Engineered for sovereign capital emission and high-fidelity decentralized execution.
                            </p>

                            {/* Network Quick Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                {networkSpecs.map((spec, idx) => (
                                    <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 flex flex-col gap-1">
                                        <div className="text-mono text-[8px] font-bold text-gray-700 tracking-[0.2em] uppercase">{spec.label}</div>
                                        <div className="text-white font-bold text-[11px] tracking-tight tabular-nums">{spec.value}</div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Product Links */}
                    <div className="lg:pt-4">
                        <div className="text-mono text-[9px] font-bold text-[#e2ff3d] tracking-[0.3em] uppercase mb-8">PRODUCT_CORE</div>
                        <ul className="space-y-4">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    {link.external ? (
                                        <a href={link.href} target="_blank" className="text-gray-500 hover:text-white text-xs font-bold tracking-tight transition-all flex items-center gap-2 group uppercase">
                                            {link.name}
                                            <ExternalLink className="w-3 h-3 text-[#e2ff3d]" />
                                        </a>
                                    ) : (
                                        <Link href={link.href} className="text-gray-500 hover:text-white text-xs font-bold tracking-tight transition-all uppercase">
                                            {link.name}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Developers Links */}
                    <div className="lg:pt-4">
                        <div className="text-mono text-[9px] font-bold text-[#e2ff3d] tracking-[0.3em] uppercase mb-8">DEV_PIPELINE</div>
                        <ul className="space-y-4">
                            {footerLinks.developers.map((link) => (
                                <li key={link.name}>
                                    <a href={link.href} target="_blank" className="text-gray-500 hover:text-white text-xs font-bold tracking-tight transition-all flex items-center gap-2 group uppercase">
                                        {link.name}
                                        <ExternalLink className="w-3 h-3 text-[#e2ff3d]" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Network Links */}
                    <div className="lg:pt-4">
                        <div className="text-mono text-[9px] font-bold text-[#e2ff3d] tracking-[0.3em] uppercase mb-8">NETWORK_OPS</div>
                        <ul className="space-y-4">
                            {footerLinks.network.map((link) => (
                                <li key={link.name}>
                                    {link.external ? (
                                        <a href={link.href} target="_blank" className="text-gray-500 hover:text-white text-xs font-bold tracking-tight transition-all flex items-center gap-2 group uppercase">
                                            {link.name}
                                            <ExternalLink className="w-3 h-3 text-[#e2ff3d]" />
                                        </a>
                                    ) : (
                                        <Link href={link.href} className="text-gray-500 hover:text-white text-xs font-bold tracking-tight transition-all uppercase">
                                            {link.name}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div className="lg:pt-4">
                        <div className="text-mono text-[9px] font-bold text-[#e2ff3d] tracking-[0.3em] uppercase mb-8">INST_HQ</div>
                        <ul className="space-y-4">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-gray-500 hover:text-white text-xs font-bold tracking-tight transition-all uppercase">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Social Links Section */}
                <div className="py-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3">
                        {socialLinks.map((social) => (
                            <a
                                key={social.name}
                                href={social.href}
                                target="_blank"
                                className="w-10 h-10 bg-white/[0.02] border border-white/10 flex items-center justify-center transition-all hover:border-[#e2ff3d]/60 hover:bg-[#e2ff3d]/5 group"
                            >
                                <social.icon className="w-5 h-5 text-gray-700 group-hover:text-[#e2ff3d] transition-colors" strokeWidth={1} />
                            </a>
                        ))}
                    </div>

                    <div className="text-center md:text-right">
                        <div className="text-mono text-[8px] font-bold text-gray-700 tracking-[0.3em] uppercase mb-1">CONTRACT_RESERVE</div>
                        <div className="text-mono text-[10px] text-[#e2ff3d]/60 font-bold tracking-tight selection:bg-[#e2ff3d] selection:text-black">
                            0x00000000219ab540356cBB839Cbe05303d7705Fa
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="py-12 border-t border-white/5">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                        <div className="text-gray-700 text-[10px] font-bold tracking-[0.05em] uppercase">
                            © 2025 ZUG_CHAIN. PROTOCOL_SECURED.
                        </div>

                        <div className="flex items-center gap-10">
                            <a href="/privacy" className="text-gray-700 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-colors">PRIVACY_PROTOCOL</a>
                            <a href="/terms" className="text-gray-700 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-colors">TERMS_OF_SERVICE</a>
                            <a href="/disclaimer" className="text-gray-700 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-colors">RISK_PARAMETERS</a>
                        </div>
                    </div>

                    <p className="text-gray-800 text-[9px] leading-relaxed max-w-4xl font-mono uppercase">
                        <span className="text-gray-600 font-bold">REGULATORY_DISCLAIMER:</span> This interface provides technical portal access to the ZUG architectural framework. Nothing herein constitutes financial, investment, legal, or tax advisory. Participants must execute independent verification of all protocol parameters. Performance of digital assets is non-guaranteed and carries high volatility risk factors.
                    </p>
                </div>

            </div>
        </footer>
    );
} 
