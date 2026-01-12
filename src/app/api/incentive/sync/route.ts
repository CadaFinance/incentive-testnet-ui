import { NextResponse } from 'next/server';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { db } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { addJob } from '@/lib/queue';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.zugchain.org";
const STAKING_CONTRACT_NATIVE = process.env.NEXT_PUBLIC_STAKING_CONTRACT_NATIVE || "0x277DFA5c0C7037007716C4C417A1b08fC9B78f2c";
const STAKING_CONTRACT_TOKEN = process.env.NEXT_PUBLIC_STAKING_CONTRACT_VZUG || "0x532EBcF976148D2531B7d75357694D2eEcA11a76";

const client = createPublicClient({
    transport: http(RPC_URL)
});

// V4 High-Fidelity Events
const STAKED_EVENT_ABI = {
    anonymous: false,
    inputs: [
        { indexed: true, name: "user", type: "address" },
        { indexed: false, name: "depositId", type: "uint256" },
        { indexed: false, name: "amount", type: "uint256" },
        { indexed: false, name: "tierId", type: "uint8" },
        { indexed: false, name: "autoCompound", type: "bool" }
    ],
    name: "Staked",
    type: "event"
} as const;

const COMPOUNDED_EVENT_ABI = {
    anonymous: false,
    inputs: [
        { indexed: true, name: "user", type: "address" },
        { indexed: false, name: "depositId", type: "uint256" },
        { indexed: false, name: "addedAmount", type: "uint256" }
    ],
    name: "Compounded",
    type: "event"
} as const;

const REWARD_CLAIMED_ABI = { anonymous: false, inputs: [{ indexed: true, name: "user", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "RewardClaimed", type: "event" } as const;
const WITHDRAWN_ABI = { anonymous: false, inputs: [{ indexed: true, name: "user", type: "address" }, { indexed: false, name: "depositId", type: "uint256" }, { indexed: false, name: "amount", type: "uint256" }], name: "Withdrawn", type: "event" } as const;

// V4 High-Fidelity Unstake
const UNSTAKE_REQUESTED_ABI = {
    anonymous: false,
    inputs: [
        { indexed: true, name: "user", type: "address" },
        { indexed: false, name: "depositId", type: "uint256" },
        { indexed: false, name: "principal", type: "uint256" },
        { indexed: false, name: "harvestedYield", type: "uint256" }
    ],
    name: "UnstakeRequested",
    type: "event"
} as const;

export async function POST(request: Request) {
    try {
        const { txHash: rawTxHash, walletAddress: rawAddress } = await request.json();
        const walletAddress = rawAddress?.toLowerCase();
        const txHash = rawTxHash?.toLowerCase();

        if (!txHash || !walletAddress) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
        if (!receipt || receipt.status !== 'success') {
            return NextResponse.json({ error: 'Transaction failed or not found' }, { status: 400 });
        }

        const toAddress = receipt.to?.toLowerCase();
        const isNative = toAddress === STAKING_CONTRACT_NATIVE.toLowerCase();
        const isToken = toAddress === STAKING_CONTRACT_TOKEN.toLowerCase();

        if (!isNative && !isToken) {
            return NextResponse.json({ error: 'Invalid contract interaction' }, { status: 400 });
        }

        // OPTIMIZATION: Use Server Time instead of Block Time to save 1 RPC Call (getBlock)
        const timestamp = new Date().toISOString();

        let eventData = null;
        let eventType = null;
        let amount = 0n;
        let harvestedYield = 0n;

        for (const log of receipt.logs) {
            try {
                if (log.address.toLowerCase() !== toAddress) continue;

                // Decode Log
                try {
                    const decoded = decodeEventLog({
                        abi: [STAKED_EVENT_ABI, COMPOUNDED_EVENT_ABI, REWARD_CLAIMED_ABI, WITHDRAWN_ABI, UNSTAKE_REQUESTED_ABI],
                        data: log.data,
                        topics: log.topics
                    });

                    eventType = decoded.eventName.toUpperCase();
                    if (decoded.eventName === 'RewardClaimed') eventType = 'REWARD_CLAIMED';
                    if (decoded.eventName === 'UnstakeRequested') eventType = 'UNSTAKE_REQUESTED';

                    if (decoded.eventName === 'Staked') {
                        amount = decoded.args.amount;
                        eventData = decoded.args;
                        break;
                    } else if (decoded.eventName === 'Compounded') {
                        amount = decoded.args.addedAmount;
                        eventData = decoded.args;
                        break;
                    } else if (decoded.eventName === 'RewardClaimed' || decoded.eventName === 'Withdrawn') {
                        amount = decoded.args.amount;
                    } else if (decoded.eventName === 'UnstakeRequested') {
                        amount = decoded.args.principal;
                        harvestedYield = decoded.args.harvestedYield;
                    }

                    // Log History immediately if not a points event (points events logged later in transaction)
                    if (['REWARD_CLAIMED', 'WITHDRAWN', 'UNSTAKE_REQUESTED'].includes(eventType)) {
                        await db.query(
                            `INSERT INTO staking_history (address, tx_hash, event_type, contract_type, amount, harvested_yield, created_at, block_number) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                             ON CONFLICT (tx_hash) DO UPDATE SET block_number = EXCLUDED.block_number`,
                            [walletAddress, txHash, eventType, isNative ? 'ZUG' : 'vZUG', Number(amount) / 1e18, Number(harvestedYield) / 1e18, timestamp, receipt.blockNumber]
                        );
                        return NextResponse.json({ success: true, points: 0, message: `${decoded.eventName} processed` });
                    }
                } catch (err) { continue; }
            } catch (e) { continue; }
        }

        if (!eventData || !eventType) {
            return NextResponse.json({ error: 'Relevant event not found' }, { status: 400 });
        }

        // OPTIMIZATION: Insert History IMMEDIATELY (Outside Transaction) for Instant UI Feedback
        // Added harvested_yield = 0 to prevent schema errors if column is NOT NULL
        await db.query(
            `INSERT INTO staking_history (address, tx_hash, event_type, contract_type, amount, harvested_yield, created_at, block_number) 
             VALUES ($1, $2, $3, $4, $5, 0, $6, $7) 
             ON CONFLICT (tx_hash) DO UPDATE SET block_number = EXCLUDED.block_number, created_at = EXCLUDED.created_at`,
            [walletAddress, txHash, eventType, isNative ? 'ZUG' : 'vZUG', Number(amount) / 1e18, timestamp, receipt.blockNumber]
        );


        // FIRE-AND-FORGET: Process Points via Redis Queue (Instant Response)
        (async () => {
            try {
                // Prepare Payload for Worker
                let tierId = 0;
                if (eventType === 'STAKED') {
                    tierId = (eventData as any).tierId as number;
                }
                const amountEth = Number(amount) / 1e18;

                // Push to "IncentiveQueue"
                await addJob('STAKE_SYNC', {
                    address: walletAddress,
                    amount: amountEth,
                    tierId,
                    txHash,
                    timestamp,
                    eventType, // Pass event type for specific logic if needed
                    isNative // Pass token type
                });

                console.log(`[Queue] Job dispatched: ${txHash}`);

                // Invalidate Cache immediately (Optimistic UI update)
                // Even though the worker hasn't finished, we clear cache so next fetch MIGHT get new data
                // Or better: The Worker invalidates cache when done! I'll let the worker do it.

            } catch (bgError) {
                console.error('Queue Dispatch Error:', bgError);
            }
        })();

        // RETURN IMMEDIATELY
        return NextResponse.json({ success: true, points: 0, message: "History logged, processing rewards in background" });

    } catch (error: any) {
        console.error('Critical Error:', error);
        return NextResponse.json({ error: 'CRITICAL_INTERNAL_ERROR' }, { status: 500 });
    }
}

