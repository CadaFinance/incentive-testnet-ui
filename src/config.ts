import { createConfig, http } from 'wagmi'
import { walletConnect, metaMask } from 'wagmi/connectors'

// Read from environment variables
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
