# TOTO DRIVE — BACKEND DEPLOYMENT GUIDE

**Target Environment:** Linux / Ubuntu 22.04 LTS Cloud Server (GCP / AWS / DigitalOcean)  
**Node.js Runtime:** v20.x LTS  
**Process Manager:** PM2  
**Reverse Proxy:** NGINX + Let's Encrypt SSL

---

## 1. Environment Configuration (`.env`)

Create a `.env` file in the workspace root with production parameters:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://totodrive_user:SecurePassword123@localhost:5432/totodrive_db
JWT_SECRET=super_secret_cryptographic_jwt_key_256_bit
YOUPI_WEBHOOK_SECRET=youpi_webhook_hmac_secret_key_99887766
CARTO_API_KEY=your_carto_basemap_api_key
```

---

## 2. PostgreSQL & Drizzle Database Setup

```bash
# Install PostgreSQL
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE totodrive_db;"
sudo -u postgres psql -c "CREATE USER totodrive_user WITH PASSWORD 'SecurePassword123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE totodrive_db TO totodrive_user;"

# Run Drizzle ORM Schema Migrations
npx drizzle-kit push
```

---

## 3. Server Build & PM2 Daemon Configuration

```bash
# Install PM2 globally
sudo npm install -g pm2

# Build production bundle
npm run build

# Start production server with PM2 daemon
pm2 start dist/server.cjs --name "totodrive-backend"
pm2 save
pm2 startup
```

---

## 4. NGINX Reverse Proxy & SSL Configuration

```nginx
# /etc/nginx/sites-available/totodrive.in
server {
    server_name api.totodrive.in;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable NGINX site and issue SSL Certificate
sudo ln -s /etc/nginx/sites-available/totodrive.in /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.totodrive.in
sudo systemctl reload nginx
```
