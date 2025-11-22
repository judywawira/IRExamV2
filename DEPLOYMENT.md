# IRExam - Deployment Guide

## Overview

This guide covers deploying IRExam to production environments using modern cloud infrastructure.

---

## Prerequisites

- Ubuntu 20.04+ server or cloud VM
- Domain name (e.g., irexam.example.com)
- SSL certificate (Let's Encrypt recommended)
- MongoDB instance (Atlas, self-hosted, or managed service)

---

## Deployment Option 1: Manual Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.9+
sudo apt install python3.9 python3.9-venv python3-pip -y

# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install nginx -y

# Install MongoDB (if self-hosting)
# Follow official MongoDB installation guide for Ubuntu
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone <repository-url> irexam
cd irexam
sudo chown -R $USER:$USER .
```

### 3. Backend Setup

```bash
cd /opt/irexam/backend

# Create virtual environment
python3.9 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create production .env
cat > .env << EOF
MONGODB_URL=mongodb://<your-mongo-host>:27017
DATABASE_NAME=irexam_production
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=["https://irexam.example.com"]
UPLOAD_DIR=/opt/irexam/uploads
ENVIRONMENT=production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=$(openssl rand -base64 12)
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
EOF

# Create uploads directory
mkdir -p /opt/irexam/uploads

# Seed admin user
python seed_admin.py

# Test server
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000
# Ctrl+C to stop
```

### 4. Frontend Build

```bash
cd /opt/irexam/frontend

# Install dependencies
npm install

# Create production .env
cat > .env << EOF
VITE_API_URL=https://irexam.example.com
VITE_WS_URL=https://irexam.example.com
EOF

# Build for production
npm run build

# Output will be in dist/ directory
```

### 5. Systemd Service for Backend

```bash
sudo nano /etc/systemd/system/irexam-api.service
```

```ini
[Unit]
Description=IRExam FastAPI Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/irexam/backend
Environment="PATH=/opt/irexam/backend/venv/bin"
ExecStart=/opt/irexam/backend/venv/bin/uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --workers 4

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable irexam-api
sudo systemctl start irexam-api
sudo systemctl status irexam-api
```

### 6. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/irexam
```

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name irexam.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name irexam.example.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/irexam.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/irexam.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend (React SPA)
    location / {
        root /opt/irexam/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Uploaded Images
    location /uploads/ {
        alias /opt/irexam/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # File Upload Size Limit
    client_max_body_size 10M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/irexam /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d irexam.example.com

# Auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
```

---

## Deployment Option 2: Docker Deployment (Recommended)

### 1. Create Dockerfile (Backend)

```dockerfile
# backend/Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:socket_app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 2. Create Dockerfile (Frontend)

```dockerfile
# frontend/Dockerfile
FROM node:16 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

### 3. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    restart: always
    environment:
      MONGODB_URL: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017
      SECRET_KEY: ${SECRET_KEY}
      DATABASE_NAME: irexam_production
      CORS_ORIGINS: '["https://irexam.example.com"]'
    volumes:
      - ./uploads:/app/uploads
    ports:
      - "8000:8000"
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend

volumes:
  mongo-data:
```

### 4. Deploy with Docker Compose

```bash
# Create .env file
cat > .env << EOF
MONGO_PASSWORD=$(openssl rand -base64 12)
SECRET_KEY=$(openssl rand -hex 32)
EOF

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## MongoDB Production Setup

### Option 1: MongoDB Atlas (Managed)

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Whitelist server IP
4. Get connection string
5. Update `MONGODB_URL` in .env

### Option 2: Self-Hosted with Replica Set

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt update
sudo apt install -y mongodb-org

# Configure replica set
sudo nano /etc/mongod.conf
```

```yaml
replication:
  replSetName: "rs0"
```

```bash
sudo systemctl restart mongod

# Initialize replica set
mongosh
> rs.initiate()
```

---

## Environment Variables Checklist

### Backend (.env)

- [ ] `MONGODB_URL` - Production MongoDB connection string
- [ ] `SECRET_KEY` - **MUST CHANGE** from default
- [ ] `CORS_ORIGINS` - Production domain only
- [ ] `ADMIN_PASSWORD` - Strong password for admin
- [ ] `ENVIRONMENT=production`

### Frontend (.env)

- [ ] `VITE_API_URL` - Production API URL
- [ ] `VITE_WS_URL` - Production WebSocket URL

---

## Security Hardening

### 1. Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Fail2Ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### 3. MongoDB Authentication

```bash
mongosh
> use admin
> db.createUser({
    user: "admin",
    pwd: "StrongPassword123",
    roles: ["root"]
  })
```

Update `MONGODB_URL`:
```
mongodb://admin:StrongPassword123@localhost:27017
```

### 4. Disable Root Login

```bash
sudo nano /etc/ssh/sshd_config
```

```
PermitRootLogin no
PasswordAuthentication no  # Use SSH keys only
```

```bash
sudo systemctl restart sshd
```

---

## Monitoring & Logging

### 1. Application Logs

```bash
# Backend logs
sudo journalctl -u irexam-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Systemd Log Limits

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
SystemMaxUse=500M
```

### 3. Monitoring Tools (Optional)

- **Uptime**: UptimeRobot, Pingdom
- **APM**: New Relic, DataDog
- **Logs**: Loggly, Papertrail

---

## Backup Strategy

### 1. MongoDB Backup

```bash
# Create backup script
cat > /opt/irexam/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/mongodb"
mkdir -p $BACKUP_DIR
mongodump --out $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x /opt/irexam/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/irexam/backup.sh
```

### 2. Uploaded Images Backup

```bash
# Sync to S3
aws s3 sync /opt/irexam/uploads s3://irexam-backups/uploads
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: nginx, HAProxy, AWS ALB
2. **Multiple Backend Instances**: Run multiple uvicorn workers
3. **Redis for Session State**: Shared state across servers
4. **CDN for Images**: CloudFlare, AWS CloudFront

### Vertical Scaling

- 2 CPU cores, 4GB RAM: 50 concurrent users
- 4 CPU cores, 8GB RAM: 200 concurrent users
- 8 CPU cores, 16GB RAM: 500+ concurrent users

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
sudo journalctl -u irexam-api -n 50

# Test manually
cd /opt/irexam/backend
source venv/bin/activate
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000
```

### WebSocket Connection Fails

- Check nginx WebSocket configuration
- Verify CORS origins
- Check SSL certificate validity

### MongoDB Connection Issues

```bash
# Test connection
mongosh "mongodb://localhost:27017"

# Check MongoDB status
sudo systemctl status mongod
```

---

## Rollback Procedure

```bash
# Stop services
sudo systemctl stop irexam-api

# Restore previous code
cd /opt/irexam
git checkout <previous-commit>

# Rebuild frontend
cd frontend
npm run build

# Restart services
sudo systemctl start irexam-api
sudo systemctl restart nginx
```

---

## Post-Deployment Checklist

- [ ] Backend API accessible at https://irexam.example.com/api/v1
- [ ] Frontend loads at https://irexam.example.com
- [ ] Can create account and login
- [ ] Admin can approve users
- [ ] Examiner can create cases
- [ ] Image upload works
- [ ] WebSocket connects (check browser console)
- [ ] Session view loads
- [ ] SSL certificate valid
- [ ] Automatic backups running
- [ ] Monitoring alerts configured

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
