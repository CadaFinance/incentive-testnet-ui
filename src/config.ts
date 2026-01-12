import { createConfig, http, cookieStorage, createStorage } from 'wagmi'
import { getDefaultConfig } from 'connectkit'

// Read from environment variables (no fallbacks - must be set in .env)
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID)
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!
const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL!
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

const zugChain = {
  id: CHAIN_ID,
  name: 'ZugChain',
  nativeCurrency: { name: 'Zug', symbol: 'ZUG', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'ZugExplorer', url: EXPLORER_URL },
  },
} as const

export const config = createConfig(
  getDefaultConfig({
    chains: [zugChain],
    transports: {
      [zugChain.id]: http(RPC_URL),
    },
    walletConnectProjectId: WALLETCONNECT_PROJECT_ID || "",
    appName: process.env.NEXT_PUBLIC_APP_NAME || "",
    appDescription: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    appIcon: process.env.NEXT_PUBLIC_APP_ICON || "",
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
  }),
)
