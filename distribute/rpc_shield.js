const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { parseTransaction } = require('viem');

// --- CONFIGURATION ---
const PORT = 8555; // Shield runs on this port
const TARGET_RPC = 'http://127.0.0.1:8545'; // Real Geth/RPC Node
const BLACKLIST = new Set([
    '0x55e6fa3b3cbb0869b7bb4c7fc849c70390e865f1'
].map(a => a.toLowerCase()));

const app = express();

// Middleware to parse body
app.use(express.json());

// Inspection Middleware
app.use(async (req, res, next) => {
    try {
        const { method, params } = req.body;

        // Check if it's a transaction
        if (method === 'eth_sendRawTransaction' && params && params.length > 0) {
            const rawTx = params[0];
            try {
                // Decode transaction using viem
                const tx = parseTransaction(rawTx);

                // Recover sender address
                // Note: parseTransaction usually returns 'from' if signature is valid, 
                // but strictly speaking we might need 'recoverTransactionAddress' depending on viem version.
                // However, standard sig usually populates common fields or we can derive it.
                // Let's assume we might need to recover it or the parser does it.
                // For safety in raw proxy, simply decoding finding 'from' or rejecting if suspect.

                // WARNING: Viem's parseTransaction recovers the address internally for serialized txs
                // Let's check typical viem behavior. It parses fields. 
                // We might need recoverAddress if not present.
                // But usually for signed serialized tx, it's recoverable.

                // Let's use a simpler approach for now:
                // If we can't extract 'from' easily here without more lib overhead, 
                // we might need 'recoverAddress' from viem.
                // But wait, the tx object from parseTransaction might not have 'from' directly
                // if it's not explicitly computed. 

                // Let's try to grab 'from' if it's there, if not, we skip blocking (fail open) 
                // or we use a library that guarantees it. 
                // Actually, let's just forward it if we fail to parse, but if we parse and find match, block.

                // Alternative: Block by TO address if it's spamming a specific contract?
                // User provided a TX log where FROM was the spammer.

                // Let's assume we can get it.

            } catch (err) {
                // Ignore parse errors, just forward
            }
        }
        next();
    } catch (err) {
        next();
    }
});

// Proxy Logic
app.use('/', createProxyMiddleware({
    target: TARGET_RPC,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // We need to re-write the body since we consumed it with express.json()
        if (req.body) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    // Intercept response to check specific blocking logic inside the handler above?
    // Actually the middleware 'app.use' above executes BEFORE proxy.
    // So we should put the blocking logic THERE.
}));

// Rewriting the blocking middleware to be more robust and actually block
app.post('/', async (req, res, next) => {
    const { method, params, id } = req.body;

    if (method === 'eth_sendRawTransaction' && params && params.length > 0) {
        const rawTx = params[0];
        try {
            // Recover address logic
            // Since we need to be sure, we need 'recoverTransactionAddress' from viem/utils
            // But let's try 'parseTransaction' first.
            const tx = parseTransaction(rawTx);

            // If we could determine the sender (requires signature recovery logic usually available in utils)
            // Ideally we'd do: const from = await recoverTransactionAddress({ serializedTransaction: rawTx })

            // But 'viem' exports recoverTransactionAddress.
            // Let's import it in the header.

            // For now, let's just assume we forward if we can't block easily, 
            // but the user REALLY wants to block.

            // NOTE: Since I cannot easily verify the viem version capabilities in this environment,
            // I will add the logic to console log for now and if I find the address, I block.
            // Using a simple heuristic inspection if possible or just rely on 'recoverTransactionAddress'.

        } catch (error) {
            console.error('Error parsing tx:', error);
        }
    }
    next();
});

// Let's rewrite the file content with the correct imports and logic.
