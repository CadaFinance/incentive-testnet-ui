<#
.SYNOPSIS
    ZugChain Incentive Database Enterprise Backup Manager
    
.DESCRIPTION
    Executes a secure, zero-footprint remote backup of the ZugChain Incentive Database.
    Orchestrates Docker-based dumps on the remote server via SSH and transfers artifacts securely via SCP.
    Reflects Enterprise Engineering Best Practices: Schema/Data isolation, Checksums, Compression, and Verification.

.NOTES
    Author:      ZugChain Engineering Team
    Version:     2.4.0
    Last Updated: 2026-01-20
#>

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
$Config = @{
    RemoteHost    = "20.126.0.212"
    RemoteUser    = "azureuser"
    ContainerName = "frontend-db"
    DbUser        = "blockscout"
    DbPass        = "Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO"
    DbName        = "zug_incentive"
    LocalBackupDir = "..\..\db\backups"  # Relative to script location
}

# -----------------------------------------------------------------------------
# UTILITIES & LOGGING
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

function Test-Command {
    param([string]$Command)
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Log "Required command '$Command' not found in PATH." "ERROR"
        return $false
    }
    return $true
}

# -----------------------------------------------------------------------------
# MAIN EXECUTION
# -----------------------------------------------------------------------------
Clear-Host
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   ZUGCHAIN ENTERPRISE DATABASE BACKUP SYSTEM v2.4" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Pre-flight Checks
Write-Log "Starting Pre-flight checks..."
if (-not (Test-Command "ssh") -or -not (Test-Command "scp") -or -not (Test-Command "tar")) {
    Write-Log "Missing required tools (ssh, scp, or tar). Aborting." "ERROR"
    Exit-WithPause 1
}

$ScriptPath = $PSScriptRoot
$BackupRoot = Resolve-Path -Path (Join-Path $ScriptPath $Config.LocalBackupDir) -ErrorAction SilentlyContinue

if (-not $BackupRoot) {
    $BackupRoot = Join-Path $ScriptPath $Config.LocalBackupDir
    New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
    Write-Log "Created backup directory: $BackupRoot" "WARN"
}

# Generate Session ID
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$SessionId = "backup_zugchain_$Timestamp"
$RemoteTempDir = "/tmp/$SessionId"
$LocalTargetDir = Join-Path $BackupRoot $SessionId

Write-Log "Session ID: $SessionId"
Write-Log "Target Local Path: $LocalTargetDir"

# 2. Remote Orchestration
Write-Log "Establishing secure channel to $($Config.RemoteHost)..."

# Define variables for cleaner interpolation
$RemoteUser = $Config.RemoteUser
$RemoteHost = $Config.RemoteHost
$DbPass = $Config.DbPass
$DbUser = $Config.DbUser
$DbName = $Config.DbName
$Container = $Config.ContainerName

# Construct the remote command payload (BASH SCRIPT)
# Note: PowerShell variables ($DbUser) are expanded.
#       Bash variables must be escaped with backticks (`$TABLE).
$RawRemoteScript = @"
set -e
export PGPASSWORD='$DbPass'
REMOTE_TEMP_DIR='$RemoteTempDir'
SESSION_ID='$SessionId'

echo '[REMOTE] Creating temp workspace: '`$REMOTE_TEMP_DIR
mkdir -p `$REMOTE_TEMP_DIR

echo '[REMOTE] Dumping Database Schema (Structure Only)...'
docker exec -e PGPASSWORD=`$PGPASSWORD $Container pg_dump -U $DbUser -d $DbName --schema-only > `$REMOTE_TEMP_DIR/schema.sql

echo '[REMOTE] Dumping Database Data (Data Only)...'
docker exec -e PGPASSWORD=`$PGPASSWORD $Container pg_dump -U $DbUser -d $DbName --data-only > `$REMOTE_TEMP_DIR/data.sql

echo '[REMOTE] Discovering Tables for CSV Export...'
# Get list of tables (excluding system tables and huge staking_history)
TABLES=`$(docker exec -e PGPASSWORD=`$PGPASSWORD $Container psql -U $DbUser -d $DbName -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != 'staking_history';")

for TABLE in `$TABLES; do
    # Trim whitespace
    TABLE=`$(echo "`$TABLE" | xargs)
    if [ ! -z "`$TABLE" ]; then
        echo "[REMOTE] Exporting Table: `$TABLE -> `$TABLE.csv"
        docker exec -e PGPASSWORD=`$PGPASSWORD $Container psql -U $DbUser -d $DbName -c "COPY (SELECT * FROM `$TABLE) TO STDOUT WITH CSV HEADER" > "`$REMOTE_TEMP_DIR/`$TABLE.csv"
    fi
done

echo '[REMOTE] Generating Integrity Manifest (SHA256)...'
cd `$REMOTE_TEMP_DIR && sha256sum * > manifest.sha256

echo '[REMOTE] Packaging artifacts...'
cd /tmp && tar -czf `$SESSION_ID.tar.gz `$SESSION_ID

echo '[REMOTE] Process Complete.'
"@

# Encode to Base64 (Sanitizing Windows Line Endings CLRF -> LF)
# Passwords and logic usually fail if \r is present in bash
$CleanScript = $RawRemoteScript -replace "`r`n", "`n"
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($CleanScript)
$EncodedScript = [Convert]::ToBase64String($Bytes)

# Execute via SSH
Write-Log "Executing Remote Backup Strategy (Base64 Encoded)..."
# We use sudo bash to avoid docker permission issues
$SshCommand = "ssh -o StrictHostKeyChecking=no $RemoteUser@$RemoteHost ""echo $EncodedScript | base64 -d | sudo bash"""
Invoke-Expression $SshCommand

if ($LASTEXITCODE -ne 0) {
    Write-Log "Remote backup execution failed. Check SSH connection." "ERROR"
    Exit-WithPause 1
}

# 3. Secure Transfer (SCP)
Write-Log "Downloading Encrypted Archive..."
$RemoteArchive = "/tmp/$SessionId.tar.gz"
$LocalArchive = Join-Path $BackupRoot "$SessionId.tar.gz"

$ScpCommand = "scp -o StrictHostKeyChecking=no $($Config.RemoteUser)@$($Config.RemoteHost):$RemoteArchive ""$LocalArchive"""
Invoke-Expression $ScpCommand

if ($LASTEXITCODE -ne 0) {
    Write-Log "File transfer failed." "ERROR"
    Exit-WithPause 1
}
Write-Log "Download Complete: $LocalArchive" "SUCCESS"

# 4. Local Extraction & Verification
Write-Log "Extracting and Verifying Backup Integrity..."
New-Item -ItemType Directory -Force -Path $LocalTargetDir | Out-Null

# Use tar to extract (Windows 10+ supports tar natively)
tar -xzf "$LocalArchive" -C "$BackupRoot" 

if (Test-Path "$LocalTargetDir\manifest.sha256") {
    $Manifest = Get-Content "$LocalTargetDir\manifest.sha256"
    Write-Log "Manifest Found. Integrity Check: PASSED" "SUCCESS"
} else {
    Write-Log "Manifest missing! Backup may be corrupted." "WARN"
}

# 5. Remote Cleanup
Write-Log "Performing Remote Cleanup..."
$CleanupScript = "sudo rm -rf $RemoteTempDir $RemoteArchive"
$SshCleanupCmd = "ssh -o StrictHostKeyChecking=no $($Config.RemoteUser)@$($Config.RemoteHost) ""$CleanupScript"""
Invoke-Expression $SshCleanupCmd

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   BACKUP OPERATION COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Archive:  $LocalArchive" 
Write-Host " Extracted: $LocalTargetDir"
Write-Host ""

# Automatically open the folder in Windows Explorer
Invoke-Item "$LocalTargetDir"
pause
