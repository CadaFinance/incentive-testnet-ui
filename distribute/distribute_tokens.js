const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, parseEther, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { defineChain } = require('viem');

// --- CONFIGURATION ---
const RPC_URL = "http://127.0.0.1:8545";
const PRIVATE_KEY = "0x766627b44fc2afc101672a7d34697993bcd91b84c25069d2f48f75b186562da7";
const VZUG_ADDRESS = "0x73dBcD3F4C75f54779FE8C9824d212150e72Fd2D";

// Process settings
const CONCURRENCY_LIMIT = 10; // Moderate concurrency to not overload the chain
const GAS_BUFFER = 1.2; // 20% gas buffer

// Files
const ZUG_FILE = path.join(__dirname, 'zugbalancesTEST.csv');
const VZUG_FILE = path.join(__dirname, 'vzugbalancesTEST.csv');
const LOG_FILE = path.join(__dirname, 'distribution_log.csv');

// Blacklist (Excluded addresses)
const BLACKLIST = new Set([
    '0xd3859889fcbdda187227c723fe097125fed2542f',
    '0x095be2517bd3b139b2cd22d21d4dec0d6aead68a',
    '0xc77462ed9d125ecc3616eca5216455e7d828d2e9',
    '0xc2350e5e6ccd85a33d42e810cf5befaba87fcdfb',
    '0x4ed9828ba8487b9160c820c8b72c573e74ebbd0a',
    '0x73247ba1be10bbc6b92c8a74ea2fbc6df9c3ca6c',
    '0x1b4e99d2a838ee7b524f47a399c34af43a8fad80'
].map(a => a.toLowerCase()));

// --- VIEM SETUP ---
const zugChain = defineChain({
    id: 824642,
    name: 'ZugChain',
    network: 'zugchain',
    nativeCurrency: { decimals: 18, name: 'Zug', symbol: 'ZUG' },
    rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } }
});

const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);

const client = createWalletClient({
    account,
    chain: zugChain,
    transport: http()
});

const publicClient = createPublicClient({
    chain: zugChain,
    transport: http()
});

// ERC20 ABI
const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ name: 'success', type: 'bool' }]
    }
];

// --- HELPERS ---

// Sleep to avoid rate limits if needed
const delay = ms => new Promise(res => setTimeout(res, ms));

// Valid address check
const isValidAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr);

// Load Processed Logs to Resume
function loadProcessedLog() {
    const processed = new Set();
    if (!fs.existsSync(LOG_FILE)) return processed;

    try {
        const data = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = data.split('\n');
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(',');
            // Format: Timestamp,Type,Address,Amount,TxHash,Status,Error
            if (parts.length >= 6) {
                const type = parts[1];
                const address = parts[2].toLowerCase();
                const status = parts[5];

                if (status === 'SUCCESS') {
                    processed.add(`${type}:${address}`);
                }
            }
        }
    } catch (err) {
        console.error(`Warning: Could not read log file to resume: ${err.message}`);
    }
    return processed;
}

// Logging Function
function logTransaction(type, address, amount, txHash, status, error = '') {
    const timestamp = new Date().toISOString();
    // Escape commas/quotes in error message just in case
    const safeError = error ? `"${error.replace(/"/g, '""')}"` : '';
    const logEntry = `${timestamp},${type},${address},${amount},${txHash},${status},${safeError}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (err) {
        console.error(`Failed to write to log file: ${err.message}`);
    }
}

// Load CSV
function loadRecipients(filePath) {
    const recipients = [];
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split('\n');

        let isHeader = true;
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (isHeader && trimmed.toLowerCase().includes('address')) {
                isHeader = false;
                continue;
            }

            const parts = trimmed.split(',');
            if (parts.length >= 2) {
                const address = parts[0].trim().toLowerCase(); // Normalize
                let amountRaw = parts[1].trim();

                // Parse float to handle scientific notation and validation
                const amountVal = parseFloat(amountRaw);

                // Validation: Must be > 10 and a valid number
                if (isValidAddress(address) && !BLACKLIST.has(address) && !isNaN(amountVal) && amountVal > 50) {
                    // Convert to fixed string to avoid scientific notation (e.g. 1e+21)
                    // limit to 18 decimals which is standard for EVM
                    const amountStr = amountVal.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 18 });
                    recipients.push({ address, amount: amountStr });
                } else if (amountVal <= 50) {
                    // console.log(`Skipping low balance: ${address} (${amountVal})`); 
                }
            }
        }
    } catch (err) {
        console.error(`Error reading ${path.basename(filePath)}: ${err.message}`);
    }
    return recipients;
}

// Transaction Executor
async function sendNative(to, amountStr, nonce) {
    try {
        const hash = await client.sendTransaction({
            to,
            value: parseEther(amountStr),
            nonce,
            // Agresif Gas Ayarları (Spam'i geçmek için)
            maxPriorityFeePerGas: parseUnits('30', 9), // 30 Gwei öncelik ücreti
            maxFeePerGas: parseUnits('50', 9)          // 50 Gwei max ücret
        });
        return { success: true, hash };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function sendToken(to, amountStr, nonce) {
    try {
        const hash = await client.writeContract({
            address: VZUG_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [to, parseEther(amountStr)], // Assuming 18 decimals for vZUG
            nonce,
            // Agresif Gas Ayarları
            maxPriorityFeePerGas: parseUnits('30', 9),
            maxFeePerGas: parseUnits('50', 9)
        });
        return { success: true, hash };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// BATCH PROCESSOR
async function processBatch(tasks, type) {
    console.log(`\nStarting Batch Process for ${type}. Total Tasks: ${tasks.length}`);

    // Ensure log file exists with header
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, 'Timestamp,Type,Address,Amount,TxHash,Status,Error\n');
    }

    let successCount = 0;
    let failCount = 0;

    // We need to manage nonce manually because of concurrency
    let currentNonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
    console.log(`Initial Nonce: ${currentNonce}`);

    for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
        const batch = tasks.slice(i, i + CONCURRENCY_LIMIT);

        // Prepare promises with assigned nonces
        const promises = batch.map((task, index) => {
            const nonce = currentNonce + index;
            if (type === 'ZUG') {
                return sendNative(task.address, task.amount, nonce).then(res => ({ ...res, ...task }));
            } else {
                return sendToken(task.address, task.amount, nonce).then(res => ({ ...res, ...task }));
            }
        });

        // Execute batch
        const results = await Promise.all(promises);

        // Process results
        for (const res of results) {
            if (res.success) {
                console.log(`[${type}] Sent ${res.amount} to ${res.address} | TX: ${res.hash}`);
                logTransaction(type, res.address, res.amount, res.hash, 'SUCCESS');
                successCount++;
            } else {
                console.error(`[${type}] FAILED to ${res.address}: ${res.error}`);
                logTransaction(type, res.address, res.amount, '', 'FAILED', res.error);
                failCount++;
            }
        }

        // Increment nonce for next batch
        currentNonce += batch.length;

        // Small delay between batches to be nice to RPC
        await delay(500);
    }

    console.log(`\n${type} Distribution Complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

// --- MAIN ---
async function main() {
    console.log('=== ZUG DATA & vZUG DATA TOKEN DISTRIBUTOR ===');
    console.log(`Operator: ${account.address}`);
    console.log(`Concurrency: ${CONCURRENCY_LIMIT}`);
    console.log(`Log File: ${LOG_FILE}`);

    // Load Processed History
    const processedKeys = loadProcessedLog();
    console.log(`Found ${processedKeys.size} previously processed transactions in log.`);

    // Load Data
    let zugRecipients = loadRecipients(ZUG_FILE);
    let vzugRecipients = loadRecipients(VZUG_FILE);

    console.log(`Loaded ${zugRecipients.length} ZUG recipients (total).`);
    console.log(`Loaded ${vzugRecipients.length} vZUG recipients (total).`);

    // Filter Already Processed
    zugRecipients = zugRecipients.filter(r => !processedKeys.has(`ZUG:${r.address}`));
    vzugRecipients = vzugRecipients.filter(r => !processedKeys.has(`vZUG:${r.address}`));

    console.log(`Remaining to process: ${zugRecipients.length} ZUG, ${vzugRecipients.length} vZUG.`);

    if (zugRecipients.length === 0 && vzugRecipients.length === 0) {
        console.log('All recipients have been processed. Exiting.');
        return;
    }

    // Confirmation
    // Note: When running with PM2, we might want to skip this confirmation or make it shorter.
    // For now, we keep it but it might be annoying in a restart loop if it crashes immediately after.
    // However, since it only crashes on error, the restart interval usually allows this.
    // If you want true unattended automation, remove the confirmation or use an ENV flag.
    if (process.env.NO_CONFIRM !== 'true') {
        console.log('\n--- CONFIRMATION ---');
        console.log('You are about to send tokens!');
        console.log('Press Ctrl+C to cancel within 5 seconds...');
        await delay(5000);
    } else {
        console.log('Skipping confirmation (NO_CONFIRM=true)');
    }

    console.log('Starting...');

    // Process ZUG - DISABLED (only sending vZUG)
    // if (zugRecipients.length > 0) {
    //     await processBatch(zugRecipients, 'ZUG');
    // }

    // Process vZUG
    if (vzugRecipients.length > 0) {
        // Refresh nonce just in case - though we track it, a fetch is safer if we mixed calls
        await processBatch(vzugRecipients, 'vZUG');
    }

    console.log('\n=== ALL OPERATIONS COMPLETE ===');
}

main().catch(console.error);
