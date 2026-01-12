#!/bin/bash

# ==============================================================================
# ZugChain Redis Installer (Native/Systemd Edition)
# ==============================================================================
# This script installs Redis natively with systemd on Ubuntu.
# Matches the exact configuration from the previous working machine.
#
# Configuration:
# - Port: 6381
# - Password: ZugChain2024!
# - Memory: 256MB
# 
# Usage: chmod +x install_redis.sh && sudo ./install_redis.sh
# ==============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (sudo)"
   exit 1
fi

# 1. Stop existing Redis if running
log_info "Stopping existing Redis (if any)..."
systemctl stop redis-server 2>/dev/null || true
pkill -f redis-server 2>/dev/null || true
sleep 1
log_success "Existing Redis stopped"

# 2. Install/Reinstall Redis
log_info "Installing Redis..."
apt update -qq
apt install -y redis-server

if [ $? -ne 0 ]; then
    log_error "Failed to install Redis"
    exit 1
fi
log_success "Redis installed"

# 2. Backup original config
log_info "Backing up original config..."
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# 3. Create custom config
log_info "Writing custom Redis configuration..."

cat > /etc/redis/redis.conf << 'EOF'
# ==============================================================================
# ZugChain Redis Configuration
# ==============================================================================

# Network
bind 0.0.0.0
port 6381
protected-mode yes
requirepass Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO

# Daemon / Systemd
daemonize yes
supervised no
pidfile /var/run/redis/redis-server.pid
loglevel notice

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (RDB Snapshots)
save 300 10
dbfilename dump.rdb
dir /var/lib/redis

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""

# Logging
logfile /var/log/redis/redis-server.log
EOF

log_success "Configuration written"

# 4. Set permissions
log_info "Setting permissions..."
chown redis:redis /etc/redis/redis.conf
chmod 640 /etc/redis/redis.conf

# Create required directories
mkdir -p /var/lib/redis
chown redis:redis /var/lib/redis
mkdir -p /var/log/redis
chown redis:redis /var/log/redis
chmod 755 /var/log/redis

# 5. Restart Redis
log_info "Restarting Redis service..."
systemctl daemon-reload
systemctl restart redis-server
systemctl enable redis-server

# 6. Verify
sleep 2
if systemctl is-active --quiet redis-server; then
    log_success "Redis is running!"
    
    # Test connection
    log_info "Testing connection..."
    PONG=$(redis-cli -p 6381 -a 'ZugChain2024!' ping 2>/dev/null)
    if [ "$PONG" = "PONG" ]; then
        log_success "Connection test passed!"
    else
        log_error "Connection test failed"
    fi
else
    log_error "Redis failed to start. Check: journalctl -u redis-server"
    exit 1
fi

# 7. Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Redis Setup Complete!                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Port:${NC}      6381"
echo -e "  ${CYAN}Password:${NC}  ZugChain2024!"
echo -e "  ${CYAN}Status:${NC}    systemctl status redis-server"
echo -e "  ${CYAN}Logs:${NC}      tail -f /var/log/redis/redis-server.log"
echo ""
echo -e "  ${CYAN}Connection URL:${NC} redis://:ZugChain2024!@<YOUR_IP>:6381"
echo ""
log_info "Don't forget to open Port 6381 in AWS Security Group!"
