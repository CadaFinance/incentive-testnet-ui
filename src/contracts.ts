/**
 * Centralized Contract Configuration
 * All contract addresses are loaded from environment variables.
 * 
 * To change addresses, edit .env.local file and restart the dev server.
 */

// ============================================================
// PUBLIC CONTRACTS (Client-side accessible)
// ============================================================

/** Native ZUG Staking Contract */
export const STAKING_CONTRACT_NATIVE =
    process.env.NEXT_PUBLIC_STAKING_CONTRACT_NATIVE;

/** vZUG Staking Contract */
export const STAKING_CONTRACT_VZUG =
    process.env.NEXT_PUBLIC_STAKING_CONTRACT_VZUG;

/** vZUG Token Address */
export const VZUG_TOKEN =
    process.env.NEXT_PUBLIC_VZUG_TOKEN;

/** Deposit Contract (for display purposes) */
export const DEPOSIT_CONTRACT =
    process.env.NEXT_PUBLIC_DEPOSIT_CONTRACT;

/** Admin/Developer Address (for UI access control) */
export const ADMIN_ADDRESS =
    (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '').toLowerCase(); // Keeping '' as safe fallback for avoiding crash on toLowerCase, but removing hardcoded address.

// ============================================================
// BUNDLED EXPORTS (for convenience)
// ============================================================

export const CONTRACTS = {
    STAKING_NATIVE: STAKING_CONTRACT_NATIVE,
    STAKING_VZUG: STAKING_CONTRACT_VZUG,
    VZUG_TOKEN: VZUG_TOKEN,
    DEPOSIT_CONTRACT: DEPOSIT_CONTRACT,
    ADMIN_ADDRESS: ADMIN_ADDRESS,
} as const;
