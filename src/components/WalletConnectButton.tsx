'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount, useDisconnect, useBalance, useSwitchChain } from 'wagmi'
import { ChevronDownIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import WalletModal from './WalletModal'
import { CHAIN_ID } from '../config'

interface WalletConnectButtonProps {
    fullWidth?: boolean;
}

export default function WalletConnectButton({ fullWidth = false }: WalletConnectButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { address, isConnected, chainId } = useAccount()
    const { disconnect } = useDisconnect()
    const { switchChain } = useSwitchChain()
    const { data: balance } = useBalance({ address })

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleConnect = () => setIsModalOpen(true)
    const handleDisconnect = () => {
        disconnect()
        setShowDropdown(false)
    }

    if (isConnected && address) {
        if (chainId !== CHAIN_ID) {
            return (
                <button
                    onClick={() => switchChain({ chainId: CHAIN_ID })}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-2 rounded-sm font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-red-500/20 transition-all tech-glow-red"
                >
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>WRONG_NETWORK</span>
                </button>
            )
        }

        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-4 bg-white/[0.02] border border-white/10 text-white px-6 py-2 rounded-sm font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-white/[0.05] transition-all group"
                >
                    <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-gray-700 font-mono text-[8px] tracking-[0.2em] uppercase font-bold">L1_SECURED</span>
                        <span className="font-mono text-white text-[12px] tabular-nums tracking-tighter">
                            {balance?.formatted ? parseFloat(balance.formatted).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0.00'}<span className="text-[#e2ff3d] ml-1 opacity-80">{balance?.symbol}</span>
                        </span>
                    </div>
                    <ChevronDownIcon className={`w-3.5 h-3.5 text-[#e2ff3d] transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                    <div className="absolute right-0 mt-3 w-56 bg-[#050505] rounded-sm inst-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="px-5 py-4 border-b border-white/[0.03] bg-white/[0.01]">
                            <div className="text-[8px] font-mono text-gray-700 tracking-[0.3em] uppercase mb-2 font-bold">NODE_AUTHENTICATED</div>
                            <div className="text-[10px] font-mono text-[#e2ff3d]/60 truncate tracking-tight selection:bg-[#e2ff3d] selection:text-black">
                                {address}
                            </div>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            className="w-full flex items-center justify-between px-5 py-4 text-[10px] font-bold tracking-[0.2em] text-red-500 hover:bg-red-500/5 transition-colors uppercase group"
                        >
                            TERMINATE_SESSION
                            <ArrowRightOnRectangleIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            <button
                onClick={handleConnect}
                className={`bg-[#e2ff3d] text-black px-6 py-2 rounded-sm font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-white transition-all tech-glow ${fullWidth ? 'w-full' : ''}`}
            >
                Connect Wallet
            </button>

            <WalletModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}