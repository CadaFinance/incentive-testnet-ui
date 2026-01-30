#!/bin/bash

# Loglardan tespit edilen spamci IP'ler
# 30/Jan/2026 logs

echo "Blocking spammer IPs..."

# 103.15.89.51 - Cok yogun istek (ozellikle POST /)
sudo ufw deny from 103.15.89.51 to any

# 182.9.2.10 - Chrome/144.0.0.0 gibi fake user agent
sudo ufw deny from 182.9.2.10 to any

# 103.170.246.3 & 131 - Yogun POST
sudo ufw deny from 103.170.246.3 to any
sudo ufw deny from 103.170.246.131 to any

# 103.241.198.225
sudo ufw deny from 103.241.198.225 to any

# 103.90.229.23 & 22 & 21
sudo ufw deny from 103.90.229.23 to any
sudo ufw deny from 103.90.229.22 to any
sudo ufw deny from 103.90.229.21 to any

# 103.71.111.x Range (194, 49, 177 goruldu)
sudo ufw deny from 103.71.111.194 to any
sudo ufw deny from 103.71.111.49 to any
sudo ufw deny from 103.71.111.177 to any

# 36.50.133.236
sudo ufw deny from 36.50.133.236 to any

# Reload firewall
sudo ufw reload

echo "Spam IPs blocked successfully."
sudo ufw status | grep DENY
