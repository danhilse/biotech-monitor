#!/bin/bash

# Setup script for biotech dashboard
echo "Setting up biotech dashboard..."

# 1. Create service user
sudo useradd -r -s /bin/false biotech

# 2. Create directory structure
sudo mkdir -p /opt/biotech-dashboard/{api,data,logs,scripts,etc/systemd/system}
sudo chown -R biotech:biotech /opt/biotech-dashboard
sudo chmod 755 /opt/biotech-dashboard

# 3. Setup Python environment
sudo apt update
sudo apt install -y python3-pip python3-venv

# 4. Create and activate virtual environment
cd /opt/biotech-dashboard
python3 -m venv venv
source venv/bin/activate

# 5. Install dependencies
pip install -r requirements.txt

# 6. Create .env file
sudo touch /opt/biotech-dashboard/.env
sudo chown biotech:biotech /opt/biotech-dashboard/.env
sudo chmod 600 /opt/biotech-dashboard/.env

# 7. Create systemd service files
cat > /etc/systemd/system/biotech-api.service << EOL
[Unit]
Description=Biotech Dashboard API
After=network.target

[Service]
User=biotech
WorkingDirectory=/opt/biotech-dashboard/api
ExecStart=/opt/biotech-dashboard/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOL

cat > /etc/systemd/system/biotech-collector.service << EOL
[Unit]
Description=Biotech Data Collection Service

[Service]
Type=oneshot
User=biotech
WorkingDirectory=/opt/biotech-dashboard/scripts
ExecStart=/opt/biotech-dashboard/venv/bin/python polygon_fetch.py

[Install]
WantedBy=multi-user.target
EOL

cat > /etc/systemd/system/biotech-collector.timer << EOL
[Unit]
Description=Biotech Data Collection Timer

[Timer]
OnCalendar=*-*-* *:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOL

# 8. Setup firewall
sudo ufw allow 8000
sudo ufw enable

# 9. Start services
sudo systemctl daemon-reload
sudo systemctl enable biotech-api
sudo systemctl start biotech-api
sudo systemctl enable biotech-collector.timer
sudo systemctl start biotech-collector.timer

echo "Setup complete!"
