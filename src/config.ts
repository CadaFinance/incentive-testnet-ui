import { createConfig, http } from 'wagmi'
import { walletConnect, metaMask } from 'wagmi/connectors'

// Read from environment variables
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 824642)
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.zugchain.org'
const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.zugchain.org'
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'd6df325bb126ba1a5bcf6576a692bde4'

export const zugChain = {
  id: CHAIN_ID,
  name: 'ZugChain',
  nativeCurrency: { name: 'Zug', symbol: 'ZUG', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'ZugExplorer', url: EXPLORER_URL },
  },
} as const

// Safe interceptor for the UI tracker
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);
    if (url.includes('rpc.zugchain.org')) {
      window.dispatchEvent(new CustomEvent('rpc-request', {
        detail: { url, timestamp: Date.now() }
      }));
    }
    // Use apply to ensure 'fetch' is called with the correct 'window' context
    return originalFetch.apply(window, args);
  };
}

export const config = createConfig({
  chains: [zugChain],
  connectors: [
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
    metaMask(),
  ],
  transports: {
    [zugChain.id]: http(RPC_URL),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
