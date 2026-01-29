import { createPublicClient, http, defineChain, formatEther } from 'viem';
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

// Configuration
const RPC_URL = "https://rpc.zugchain.org";
const DATABASE_URL = "postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive";

// Contracts Configuration
const CONTRACTS = [
    { type: "ZUG", address: "0x4ed9828ba8487b9160C820C8b72c573E74eBbD0A" },  // Native
    { type: "vZUG", address: "0x58D3E94a4D7C0D3F4B0c03861F7E9d81d71EDC0F" }   // vZUG Token
];

// Contract ABI (getUserDeposits)
const ABI = [
    {
        inputs: [{ name: "_user", type: "address" }],
        name: "getUserDeposits",
        outputs: [{
            components: [
                { name: "amount", type: "uint256" },
                { name: "weightedAmount", type: "uint256" },
                { name: "rewardDebt", type: "uint256" },
                { name: "lockEndTime", type: "uint256" },
                { name: "unbondingEnd", type: "uint256" },
                { name: "tierId", type: "uint8" },
                { name: "isWithdrawn", type: "bool" },
                { name: "totalClaimed", type: "uint256" },
                { name: "totalCompounded", type: "uint256" },
                { name: "useAutoCompound", type: "bool" },
                { name: "lastAutoCompound", type: "uint256" }
            ],
            name: "",
            type: "tuple[]"
        }],
        stateMutability: "view",
        type: "function"
    }
];

const ZUG_CHAIN = defineChain({
    id: 824642,
    name: 'ZugChain',
    network: 'zugchain',
    nativeCurrency: { name: 'Zug', symbol: 'ZUG', decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } }
});

const BATCH_SIZE = 2500; // MAX SPEED - High parallelism

async function main() {
    console.log(`\n=== AGGREGATED PROTOCOL SNAPSHOT (SPEED MODE) ===`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // 1. Fetch All Users from Database
    const dbClient = new Client({ connectionString: DATABASE_URL, ssl: false });
    let users = [];
    try {
        await dbClient.connect();
        const res = await dbClient.query("SELECT address FROM users ORDER BY address ASC");
        users = res.rows.map(r => r.address);
        console.log(`[DATABASE] Found ${users.length} unique user addresses.`);
    } catch (error) {
        console.error(`[DATABASE] Error.`, error);
        process.exit(1);
    } finally {
        await dbClient.end();
    }

    // 2. Fetch and Aggregate
    const publicClient = createPublicClient({
        chain: ZUG_CHAIN,
        transport: http()
    });

    let aggregatedData = [];
    let processedCount = 0;

    async function fetchAndAggregateUser(userAddress) {
        let results = [];
        for (const contract of CONTRACTS) {
            try {
                const deposits = await publicClient.readContract({
                    address: contract.address,
                    abi: ABI,
                    functionName: 'getUserDeposits',
                    args: [userAddress]
                });

                // Sum active (non-withdrawn) amounts for this contract
                const totalAmount = deposits
                    .filter(d => !d.isWithdrawn)
                    .reduce((acc, curr) => acc + parseFloat(formatEther(curr.amount)), 0);

                if (totalAmount > 0) {
                    results.push({
                        UserAddress: userAddress,
                        ContractType: contract.type,
                        Amount: totalAmount.toFixed(4)
                    });
                }
            } catch (err) { }
        }
        return results;
    }

    console.log(`[BLOCKCHAIN] Fetching with BATCH_SIZE=${BATCH_SIZE}...`);
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(addr => fetchAndAggregateUser(addr)));

        batchResults.forEach(res => aggregatedData.push(...res));
        processedCount += batch.length;

        if (processedCount % 500 === 0 || processedCount === users.length) {
            process.stdout.write(`\r   > Progress: ${processedCount}/${users.length} addresses scanned...`);
        }
    }

    console.log(`\n\n[SUCCESS] Collection Complete.`);

    // 3. Save CSV
    const snapshotFile = `aggregated_stakes.csv`;
    const headers = "UserAddress,ContractType,Amount";
    const rows = aggregatedData.map(d => `${d.UserAddress},${d.ContractType},${d.Amount}`);
    fs.writeFileSync(snapshotFile, [headers, ...rows].join("\n"));

    console.log(`[SUCCESS] Saved ${aggregatedData.length} records to ${snapshotFile}`);
}

main();
