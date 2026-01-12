import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCompact(amount: bigint | string | number | undefined) {
    if (!amount) return '0.00'
    const val = typeof amount === 'bigint' ? Number(amount) / 1e18 : Number(amount)

    if (val >= 1_000_000_000) {
        return (val / 1_000_000_000).toFixed(2) + 'B'
    } else if (val >= 1_000_000) {
        return (val / 1_000_000).toFixed(2) + 'M'
    } else if (val >= 100_000) {
        return (val / 1_000).toFixed(1) + 'K'
    } else {
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
}

export function formatZug(amount: bigint | string | number | undefined) {
    return formatCompact(amount)
}

export function formatAddress(address: string) {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}
