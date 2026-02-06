import { createConfig, http } from 'wagmi'
import { walletConnect, metaMask } from 'wagmi/connectors'

// Read from environment variables
// Read from environment variables (No Hardcoded Values)
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL!;
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

if (!CHAIN_ID || !RPC_URL || !EXPLORER_URL || !WALLETCONNECT_PROJECT_ID) {
  throw new Error("Missing required environment variables in config.ts");
}

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

// Safe interceptor for the UI tracker & Ban Detection
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);

    // 1. Tracking
    if (url.includes('rpc.zugchain.org')) {
      window.dispatchEvent(new CustomEvent('rpc-request', {
        detail: { url, timestamp: Date.now() }
      }));
    }

    // 2. Execute Request
    const response = await originalFetch.apply(window, args);

    // 3. Security & Ban Detection
    // If we get a 403 from RPC or a 302 Redirect to /verify
    if (url.includes('rpc.zugchain.org')) {
      if (response.status === 403 || response.redirected && response.url.includes('/verify')) {
        console.warn("🛡️ Security Access Denied: Redirecting to Verification...");
        // Prevent infinite loops if already on verify page
        if (!window.location.pathname.includes('/verify')) {
          window.location.href = '/verify?reason=automated_ban';
        }
      }
    }

    return response;
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
