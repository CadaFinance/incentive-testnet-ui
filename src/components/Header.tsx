'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { HiX } from 'react-icons/hi'
import Link from 'next/link'
import Image from 'next/image'
import WalletConnectButton from './WalletConnectButton'

const navigation: { name: string; href: string; external?: boolean }[] = [

    { name: 'STAKE', href: '/' },
    { name: 'VAULT', href: '/staking/vzug' },
    { name: 'FAUCET', href: '/faucet' },
    { name: 'EXPLORER', href: 'https://explorer.zugchain.org' },
    { name: 'LEADERBOARD', href: '/leaderboard' },
    { name: 'WHITEPAPER', href: 'http://10.10.10.245:3001/whitepaper' },
    { name: 'AIRDROP', href: '/mission-control' },
    { name: 'DOCS', href: '/docs' },

]

import { useAccount } from 'wagmi'

import { useSearchParams, usePathname } from 'next/navigation'

export default function Header() {
    const { address } = useAccount()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    // Capture Ref from URL
    useEffect(() => {
        const refParam = searchParams.get('ref')
        if (refParam) {
            localStorage.setItem('zug_ref_code', refParam)
        }
    }, [searchParams])

    // Sync User on Connect
    useEffect(() => {
        if (address) {
            const storedRef = localStorage.getItem('zug_ref_code')
            fetch('/api/user/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, referralCode: storedRef })
            }).catch(e => console.error("Sync failed", e));
        }
    }, [address]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-[110] transition-all duration-500 ${scrolled ? 'bg-[#050505]/80 backdrop-blur-md border-b border-white/[0.05]' : 'bg-transparent'
                    }`}
            >
                <div className="container mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-x-10">
                            <Link href="http://10.10.10.245:3001/" className="flex items-center group relative">
                                {/* Mobile: Show text logo */}
                                <div className="relative h-6 w-24 lg:hidden">
                                    <Image
                                        src="/logo_text_dark.png"
                                        alt="ZUG"
                                        fill
                                        className="object-contain brightness-150"
                                    />
                                    <div className="absolute inset-0 bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>
                                {/* Desktop: Show SVG logo */}
                                <div className="relative h-6 w-6 hidden lg:block">
                                    <Image
                                        src="/zug_logo.svg"
                                        alt="ZUG"
                                        fill
                                        className="object-contain"
                                    />
                                    <div className="absolute inset-0 bg-[#e2ff3d]/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>
                            </Link>

                            <nav className="hidden lg:flex items-center gap-x-6">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return item.external ? (
                                        <a
                                            key={item.name}
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-mono text-[11px] font-medium tracking-[0.05em] text-gray-400 hover:text-[#e2ff3d] transition-colors duration-200 uppercase"
                                        >
                                            {item.name}
                                        </a>
                                    ) : (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`text-mono text-[11px] font-medium tracking-[0.05em] transition-colors duration-200 uppercase ${isActive ? 'text-[#e2ff3d] text-shadow-sm' : 'text-gray-400 hover:text-[#e2ff3d]'
                                                }`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                                {address?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266').toLowerCase() && (
                                    <Link
                                        href="/admin"
                                        className={`text-mono text-[11px] font-medium tracking-[0.05em] transition-colors duration-200 uppercase ${pathname === '/admin' ? 'text-[#e2ff3d]' : 'text-red-500/80 hover:text-red-500'
                                            }`}
                                    >
                                        ADMIN
                                    </Link>
                                )}
                            </nav>
                        </div>

                        <div className="flex items-center gap-x-3">
                            <WalletConnectButton />

                            {/* Social Icons - More Minimalist */}
                            <div className="hidden sm:flex items-center gap-1.5 ml-2 border-l border-white/10 pl-4">
                                <a
                                    href="https://twitter.com/ZugChain_org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 flex items-center justify-center rounded border border-white/5 hover:border-[#e2ff3d]/30 hover:bg-[#e2ff3d]/5 transition-all group"
                                >
                                    <Image src="/twitter.png" alt="X" width={12} height={12} className="opacity-30 group-hover:opacity-100 transition-opacity invert" />
                                </a>
                                <a
                                    href="https://t.me/zugchain"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 flex items-center justify-center rounded border border-white/5 hover:border-[#e2ff3d]/30 hover:bg-[#e2ff3d]/5 transition-all group"
                                >
                                    <Image src="/telegram.png" alt="TG" width={12} height={12} className="opacity-30 group-hover:opacity-100 transition-opacity invert" />
                                </a>
                            </div>

                            <button
                                className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors "
                                onClick={() => setIsMenuOpen(true)}
                            >
                                <Bars3Icon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <Dialog open={isMenuOpen} onClose={setIsMenuOpen} className="lg:hidden">
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" />
                <DialogPanel className="fixed inset-y-0 right-0 z-[110] w-full overflow-y-auto bg-[#050505] px-6 py-6 sm:max-w-xs border-l border-white/5">
                    <div className="flex items-center justify-between mb-10">
                        <Link href="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
                            <div className="relative h-6 w-24">
                                <Image
                                    src="/logo_text_dark.png"
                                    alt="ZUG"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </Link>
                        <button
                            type="button"
                            className="p-1.5 text-gray-400 hover:text-white"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <HiX className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="mt-6 flow-root">
                        <div className="space-y-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded px-3 py-3 text-mono text-sm font-medium text-gray-400 hover:text-[#e2ff3d] hover:bg-white/5 transition-all uppercase"
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                        <div className="mt-8 pt-2 border-t border-white/5">

                            <div className="mt-6 flex justify-start gap-4 px-3">
                                <a href="https://twitter.com/ZugChain_org" target="_blank" rel="noopener noreferrer">
                                    <Image src="/twitter.png" alt="X" width={18} height={18} className="invert opacity-40" />
                                </a>
                                <a href="https://t.me/zugchain" target="_blank" rel="noopener noreferrer">
                                    <Image src="/telegram.png" alt="TG" width={18} height={18} className="invert opacity-40" />
                                </a>
                            </div>
                        </div>
                    </div>
                </DialogPanel>
            </Dialog>
        </>
    )
}
