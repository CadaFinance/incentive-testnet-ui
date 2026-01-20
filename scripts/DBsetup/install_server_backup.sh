#!/bin/bash

# ==============================================================================
# ZugChain Server-Side Automation Installer
# ==============================================================================
# This script installs a "Set-and-Forget" automated backup system locally.
# It sets up a Systemd Timer to run backups twice daily.
#
# Usage: 
#   chmod +x install_server_backup.sh
#   sudo ./install_server_backup.sh
#
# ==============================================================================

set -e

# Configuration (Embedded Creds for Server-Side Usage)
BACKUP_ROOT="/opt/zugchain-backup"
BACKUP_SCRIPT="$BACKUP_ROOT/run_backup.sh"
CONTAINER="frontend-db"
DB_USER="blockscout"
DB_NAME="zug_incentive"
# Note: Using single quotes for password to avoid special char expansion issues
DB_PASS='Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO'

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}   ZUGCHAIN SERVER AUTOMATION INSTALLER${NC}"
echo -e "${CYAN}================================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./install_server_backup.sh)"
  exit 1
fi

# 1. Prepare Directory
echo "1. Creating Directories..."
mkdir -p "$BACKUP_ROOT/dump/current"
chmod 755 "$BACKUP_ROOT"

# 2. Create the Backup Logic Script
echo "2. Writing Backup Logic Script..."
cat > "$BACKUP_SCRIPT" <<EOF
#!/bin/bash
set -e

# Configuration
DUMP_ROOT="$BACKUP_ROOT/dump"
LOG_DATE=\$(date "+%Y-%m-%d %H:%M:%S")
TIMESTAMP=\$(date "+%Y-%m-%d_%H-%M-%S")
TARGET_DIR="\$DUMP_ROOT/backup_\$TIMESTAMP"

CONTAINER_NAME="$CONTAINER"
DB_U="$DB_USER"
DB_N="$DB_NAME"
export PGPASSWORD='$DB_PASS'

echo "[\$LOG_DATE] Starting Recurring Backup..."

# Rotation: Wipe entire dump directory to remove previous timestamped folders
if [ -d "\$DUMP_ROOT" ]; then
    echo "[\$LOG_DATE] Cleaning old backups..."
    rm -rf "\$DUMP_ROOT"/*
else
    mkdir -p "\$DUMP_ROOT"
fi

mkdir -p "\$TARGET_DIR"

# Dump Schema
echo "[\$LOG_DATE] Dumping Schema to \$TARGET_DIR..."
docker exec -e PGPASSWORD=\$PGPASSWORD \$CONTAINER_NAME pg_dump -U \$DB_U -d \$DB_N --schema-only > "\$TARGET_DIR/schema.sql"

# Dump Data
echo "[\$LOG_DATE] Dumping Data..."
docker exec -e PGPASSWORD=\$PGPASSWORD \$CONTAINER_NAME pg_dump -U \$DB_U -d \$DB_N --data-only > "\$TARGET_DIR/data.sql"

# Dump Tables as CSV (Optional, keeping consistent with manual backup)
# Excluding large history tables for speed/size optimization
echo "[\$LOG_DATE] Dumping Tables (CSV)..."
TABLES=\$(docker exec -e PGPASSWORD=\$PGPASSWORD \$CONTAINER_NAME psql -U \$DB_U -d \$DB_N -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != 'staking_history';")

for TABLE in \$TABLES; do
    T=\$(echo "\$TABLE" | xargs)
    if [ ! -z "\$T" ]; then
         docker exec -e PGPASSWORD=\$PGPASSWORD \$CONTAINER_NAME psql -U \$DB_U -d \$DB_N -c "COPY (SELECT * FROM \$T) TO STDOUT WITH CSV HEADER" > "\$TARGET_DIR/\$T.csv"
    fi
done

# Generate Manifest
cd "\$TARGET_DIR" && sha256sum * > manifest.sha256

echo "[\$LOG_DATE] Backup Complete. Location: \$TARGET_DIR"
EOF

chmod +x "$BACKUP_SCRIPT"

# 3. Create Systemd Service
echo "3. Creating Systemd Service..."
cat > /etc/systemd/system/zug-backup.service <<EOF
[Unit]
Description=ZugChain Database Backup Worker
After=docker.service network.target

[Service]
Type=oneshot
User=root
ExecStart=/bin/bash $BACKUP_SCRIPT
StandardOutput=append:/var/log/zugchain-backup.log
StandardError=append:/var/log/zugchain-backup.log
EOF

# 4. Create Systemd Timer (Running at 00:00 and 12:00)
echo "4. Creating Systemd Timer (00:00 & 12:00 Daily)..."
cat > /etc/systemd/system/zug-backup.timer <<EOF
[Unit]
Description=Run ZugChain Backup twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# 5. Enable and Start
echo "5. Activating Automation..."
systemctl daemon-reload
systemctl enable zug-backup.timer
systemctl start zug-backup.timer

# 6. Test Run
echo "6. Triggering immediate test run..."
systemctl start zug-backup.service

echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}   INSTALLATION COMPLETE${NC}"
echo -e "${GREEN}================================================================${NC}"
echo " Status:    Active (Timer Enabled)"
echo " Schedule:  Every 12 Hours (00:00, 12:00)"
echo " Path:      $BACKUP_ROOT/dump/"
echo " Logs:      tail -f /var/log/zugchain-backup.log"
echo ""
