<#
.SYNOPSIS
    ZugChain On-Chain Balance Reporter (Blockscout Edition)
    
.DESCRIPTION
    Generates a definitive CSV report of ALL holders on the chain by querying
    the Blockscout Explorer Database directly.
    
    Data Source: 'blockscout-db' container (PostgreSQL)
    1. Native ZUG Balance: From 'addresses' table.
    2. vZUG Token Balance: From 'address_current_token_balances' table.
    
    Uses Base64 encoding to bypass PowerShell/SSH string parsing issues.

.NOTES
    Author:      ZugChain Engineering Team
    Version:     2.1.0
#>

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
$Config = @{
    RemoteHost    = "20.160.155.158"
    RemoteUser    = "azureuser"
    ContainerName = "blockscout-db"
    DbUser        = "blockscout"
    DbPass        = "zugchain_explorer_2024"
    DbName        = "blockscout"
    TargetToken   = "0xB5662993e77513393322A1A59651108CD5eFB787" # vZUG
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
Write-Host "   ZUGCHAIN ON-CHAIN HOLDER SNAPSHOT (VIA BLOCKSCOUT)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptPath = $PSScriptRoot
$BackupRoot = Join-Path $ScriptPath $Config.LocalBackupDir
if (-not (Test-Path $BackupRoot)) { New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null }

$SessionId = "holders_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
$RemoteOutputFile = "/tmp/holders_$SessionId.csv"
$LocalOutputFile = Join-Path $BackupRoot "holders_$SessionId.csv"

# Remove 0x prefix for bytea decoding in SQL
$TokenHex = $Config.TargetToken.Substring(2)

# -----------------------------------------------------------------------------
# 1. CONSTRUCT REMOTE SCRIPT (BASH)
# -----------------------------------------------------------------------------
# We create a bash script that handles the SQL query locally on the server.
# This avoids PowerShell parsing issues with quotes/parentheses.

$RemoteBashScript = @"
set -e
export PGPASSWORD='$($Config.DbPass)'

echo '[REMOTE] Executing Query...'

# We use a Here-Doc to pass SQL to psql via stdin (docker exec -i)
# This avoids all quoting issues with params.
sudo docker exec -i $($Config.ContainerName) psql -U $($Config.DbUser) -d $($Config.DbName) > $RemoteOutputFile <<EOF
COPY (
    WITH native AS (
        SELECT hash as address_hash, fetched_coin_balance as val 
        FROM addresses 
        WHERE fetched_coin_balance > 0
    ),
    token AS (
        SELECT address_hash, value as val 
        FROM address_current_token_balances
        WHERE token_contract_address_hash = decode('$TokenHex', 'hex')
        AND value > 0
    )
    SELECT 
        '0x' || encode(COALESCE(native.address_hash, token.address_hash), 'hex') as address,
        (COALESCE(native.val, 0) / 1e18)::numeric(50,18) as zug_native,
        (COALESCE(token.val, 0) / 1e18)::numeric(50,18) as vzug_token
    FROM native
    FULL OUTER JOIN token ON native.address_hash = token.address_hash
) TO STDOUT WITH CSV HEADER;
EOF

echo '[REMOTE] Success.'
"@

# -----------------------------------------------------------------------------
# 2. ENCODE & EXECUTE
# -----------------------------------------------------------------------------
Write-Log "Generating secure payload..."

# CRITICAL: Replace Windows CRLF with Linux LF before encoding
# Otherwise bash sees 'set -e\r' and fails
$RemoteBashScript = $RemoteBashScript -replace "`r`n", "`n"

# Convert Bash script to Base64 to bypass all escaping hell
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RemoteBashScript)
$EncodedScript = [Convert]::ToBase64String($Bytes)

Write-Log "Connecting to remote server..."
# Decode and Execute on Remote
$SshCmd = "ssh -o StrictHostKeyChecking=no $($Config.RemoteUser)@$($Config.RemoteHost) ""echo $EncodedScript | base64 -d | bash"""
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
$CleanupCmd = "rm $RemoteOutputFile"
Invoke-Expression "ssh -o StrictHostKeyChecking=no $($Config.RemoteUser)@$($Config.RemoteHost) ""$CleanupCmd"""

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   SNAPSHOT COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " File: $LocalOutputFile"
Write-Host " Note: Balances are formatted as standard decimal (18 decimals applied)."

Invoke-Item "$LocalOutputFile"
pause
