<#
.SYNOPSIS
    ZugChain Staking V4 Snapshot Tool
    
.DESCRIPTION
    Generates a CSV report of user deposits in the Staking V4 contracts.
    
    Target Contracts:
    1. Native Staking: 0x4ed9828ba8487b9160C820C8b72c573E74eBbD0A
    2. Token Staking : 0x58D3E94a4D7C0D3F4B0c03861F7E9d81d71EDC0F
    
    Method:
    1. Fetches all known users from the DB (PostgreSQL).
    2. Uses 'viem' (RPC) to call 'getUserDeposits(user)' on both contracts.
    3. Sums up 'amount' for all active deposits (isWithdrawn=false).
    
    Uses Base64 encoding for robust remote execution.

.NOTES
    Author:      ZugChain Engineering Team
    Version:     1.0.0
#>

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
$Config = @{
    RemoteHost    = "20.160.155.158"
    RemoteUser    = "azureuser"
    WorkingDir    = "/opt/zugchain-autocompound"
    LocalBackupDir = "..\..\db\snapshots"
}

# -----------------------------------------------------------------------------
# LOGGING UTILS
# -----------------------------------------------------------------------------
function Write-Log {
    param([string]$Message, [string]$Level="INFO")
    $Color = "White"
    if ($Level -eq "SUCCESS") { $Color = "Green" }
    elseif ($Level -eq "WARN") { $Color = "Yellow" }
    elseif ($Level -eq "ERROR") { $Color = "Red" }
    elseif ($Level -eq "HEADER") { $Color = "Cyan" }
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$Timestamp] [$Level] $Message" -ForegroundColor $Color
}

function Exit-WithPause {
    param([int]$Code)
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit $Code
}

# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------
Clear-Host
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   ZUGCHAIN STAKING V4 SNAPSHOT SYSTEM" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptPath = $PSScriptRoot
$BackupRoot = Join-Path $ScriptPath $Config.LocalBackupDir
if (-not (Test-Path $BackupRoot)) { New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null }

$SessionId = "staking_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
$RemoteOutputFile = "/tmp/staking_$SessionId.csv"
$LocalOutputFile = Join-Path $BackupRoot "staking_$SessionId.csv"

# -----------------------------------------------------------------------------
# 1. GENERATE REMOTE NODE.JS SCRIPT
# -----------------------------------------------------------------------------
# This script uses the environment already set up for the auto-compound bot
# to query the blockchain efficiently.

$RemoteNodeScript = @"
const { createPublicClient, http, formatEther, parseAbi } = require('viem');
const { Pool } = require('pg');
const fs = require('fs');

// --- CONFIG ---
const DB_CONFIG = { connectionString: process.env.DATABASE_URL || 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@localhost:5432/zug_incentive' };
const RPC_URL = 'https://rpc.zugchain.org';

const CONTRACTS = {
    NATIVE: '0x4ed9828ba8487b9160C820C8b72c573E74eBbD0A',
    TOKEN:  '0x58D3E94a4D7C0D3F4B0c03861F7E9d81d71EDC0F'
};

const ABI = parseAbi([
    'struct Deposit { uint256 amount; uint256 weightedAmount; uint256 rewardDebt; uint256 lockEndTime; uint256 unbondingEnd; uint8 tierId; bool isWithdrawn; uint256 totalClaimed; uint256 totalCompounded; bool useAutoCompound; uint256 lastAutoCompound; }',
    'function getUserDeposits(address) view returns (Deposit[])'
]);

async function main() {
    console.log('[SNAPSHOT] Connecting to DB...');
    const pool = new Pool(DB_CONFIG);
    const client = createPublicClient({ transport: http(RPC_URL) });

    // 1. Get All Users known to the Incentive DB
    const res = await pool.query('SELECT DISTINCT address FROM users');
    const users = res.rows.map(r => r.address);
    console.log(\`[SNAPSHOT] Found \${users.length} unique users to scan.\`);
    await pool.end();

    const results = [];
    results.push('address,native_staked,token_staked');

    // 2. Query Chain (Batched for speed)
    console.log('[SNAPSHOT] Querying User Deposits...');
    
    let processed = 0;
    const CONCURRENCY = 20;
    
    for (let i = 0; i < users.length; i += CONCURRENCY) {
        const batch = users.slice(i, i + CONCURRENCY);
        
        await Promise.all(batch.map(async (user) => {
            try {
                // Parallel Calls to both contracts
                const [nativeDeposits, tokenDeposits] = await Promise.all([
                    client.readContract({ address: CONTRACTS.NATIVE, abi: ABI, functionName: 'getUserDeposits', args: [user] }).catch(() => []),
                    client.readContract({ address: CONTRACTS.TOKEN,  abi: ABI, functionName: 'getUserDeposits', args: [user] }).catch(() => [])
                ]);
                
                // Sum active amounts (isWithdrawn == false)
                const sumNative = nativeDeposits.reduce((acc, d) => d.isWithdrawn ? acc : acc + d.amount, 0n);
                const sumToken  = tokenDeposits.reduce((acc, d) => d.isWithdrawn ? acc : acc + d.amount, 0n);
                
                // Only record non-zero stakers to keep report clean
                if (sumNative > 0n || sumToken > 0n) {
                    const n = formatEther(sumNative);
                    const t = formatEther(sumToken);
                    results.push(\`\${user},\${n},\${t}\`);
                }
            } catch (err) {
                console.error(\`[ERROR] \${user}: \${err.message}\`);
            }
        }));
        
        processed += batch.length;
        if (processed % 50 === 0) console.log(\`[PROGRESS] \${processed}/\${users.length}\`);
    }

    fs.writeFileSync('$RemoteOutputFile', results.join('\\n'));
    console.log('[SNAPSHOT] Complete. CSV generated.');
}

main().catch(err => { console.error(err); process.exit(1); });
"@

# -----------------------------------------------------------------------------
# 2. ENCODE & EXECUTE
# -----------------------------------------------------------------------------
Write-Log "Generating secure payload..."

# Sanitize Line Endings (CRLF -> LF)
$RemoteNodeScript = $RemoteNodeScript -replace "`r`n", "`n"

# Base64 Encode
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RemoteNodeScript)
$EncodedScript = [Convert]::ToBase64String($Bytes)

Write-Log "Connecting to remote server..."

# We write the node script to a temp file remotely, then execute it
$RemoteScriptPath = "/tmp/staking_snapshot.js"
$B64Command = "echo $EncodedScript | base64 -d > $RemoteScriptPath"

# Execution Command (using existing heavy dependencies in /opt/zugchain-autocompound)
$ExecCommand = "cd $($Config.WorkingDir) && node $RemoteScriptPath"

# Combine into one SSH call for atomic execution
$FullCommand = "$B64Command && $ExecCommand"

$SshCmd = "ssh -o StrictHostKeyChecking=no $($Config.RemoteUser)@$($Config.RemoteHost) ""$FullCommand"""
Invoke-Expression $SshCmd

if ($LASTEXITCODE -ne 0) { 
    Write-Log "Remote execution failed." "ERROR"
    Exit-WithPause 1 
}

# -----------------------------------------------------------------------------
# 3. DOWNLOAD REPORT
# -----------------------------------------------------------------------------
Write-Log "Downloading report to: $LocalOutputFile"

$ScpDownload = "scp -o StrictHostKeyChecking=no $($Config.RemoteUser)@$($Config.RemoteHost):$RemoteOutputFile ""$LocalOutputFile"""
Invoke-Expression $ScpDownload

if ($LASTEXITCODE -ne 0) { Write-Log "Download failed." "ERROR"; Exit-WithPause 1 }

# 4. Cleanup
Write-Log "Cleaning up remote artifacts..."
$CleanupCmd = "rm $RemoteOutputFile $RemoteScriptPath"
Invoke-Expression "ssh -o StrictHostKeyChecking=no $($Config.RemoteUser)@$($Config.RemoteHost) ""$CleanupCmd"""

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   SNAPSHOT COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " File: $LocalOutputFile"

Invoke-Item "$LocalOutputFile"
pause
