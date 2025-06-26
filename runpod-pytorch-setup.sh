#!/bin/bash

# 🚀 RunPod PyTorch Setup Script for Manufacturing Analytics
# Optimized for the PyTorch base image

echo "🚀 Setting up Manufacturing Analytics on RunPod PyTorch"
echo "======================================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Update system
echo -e "${BLUE}→ Updating system...${NC}"
apt-get update -qq

# Install Node.js 20 (PyTorch image doesn't have it)
echo -e "${BLUE}→ Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install essential tools
echo -e "${BLUE}→ Installing essential tools...${NC}"
apt-get install -y git curl wget jq

# Install PM2 for process management
npm install -g pm2

# Clone the project
echo -e "${BLUE}→ Cloning project...${NC}"
cd /workspace
git clone https://github.com/PatClay7325/manufacturing-analytics-platform.git app
cd app

# Setup environment
echo -e "${BLUE}→ Setting up environment...${NC}"
cat > .env << 'ENVFILE'
# Supabase Configuration
SUPABASE_URL=https://qokidhakjukuctgffaso.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFva2lkaGFranVrdWN0Z2ZmYXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5Mjg0NjEsImV4cCI6MjA2NjUwNDQ2MX0.wRNPX_9BsaaiGMnOJvuV_7_CztDLgFlYRVOgnuCF62k
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFva2lkaGFranVrdWN0Z2ZmYXNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDkyODQ2MSwiZXhwIjoyMDY2NTA0NDYxfQ.n2BIN547_liQRwNbedLEeKTmD7tnPrqwjDjnBI_GWuw
DATABASE_URL=postgresql://postgres:Otobale@1996@db.qokidhakjukuctgffaso.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:Otobale@1996@db.qokidhakjukuctgffaso.supabase.co:5432/postgres

# Authentication
NEXTAUTH_URL=https://zopzt8o1vw2hfx-3000.proxy.runpod.net
NEXTAUTH_SECRET=yx8Z3kqL9mNpRsTvWxYz4aBcDeFgHjKmNpQrStUvWxYz
JWT_SECRET=abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx
JWT_REFRESH_SECRET=zyxw9876vuts5432rqpo1098nmlk7654jihg3210fedc

# AI Services
ANTHROPIC_API_KEY=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

# Application
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://qokidhakjukuctgffaso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFva2lkaGFranVrdWN0Z2ZmYXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5Mjg0NjEsImV4cCI6MjA2NjUwNDQ2MX0.wRNPX_9BsaaiGMnOJvuV_7_CztDLgFlYRVOgnuCF62k
ENVFILE

# Install dependencies
echo -e "${BLUE}→ Installing dependencies...${NC}"
npm install

# Setup Prisma
echo -e "${BLUE}→ Setting up database...${NC}"
npx prisma generate
npx prisma db push --skip-generate

# Seed database
echo -e "${BLUE}→ Seeding database...${NC}"
npm run prisma:seed || echo "Seeding skipped"

# Build application
echo -e "${BLUE}→ Building application...${NC}"
npm run build

# Install code-server
echo -e "${BLUE}→ Installing VS Code Server...${NC}"
curl -fsSL https://code-server.dev/install.sh | sh

# Configure VS Code
mkdir -p ~/.config/code-server
cat > ~/.config/code-server/config.yaml << CODECONFIG
bind-addr: 0.0.0.0:8080
auth: password
password: RunPod2024!
cert: false
CODECONFIG

# Install VS Code extensions
echo -e "${BLUE}→ Installing VS Code extensions...${NC}"
code-server --install-extension anthropic.claude-code --force
code-server --install-extension dbaeumer.vscode-eslint --force
code-server --install-extension esbenp.prettier-vscode --force
code-server --install-extension prisma.prisma --force

# Configure Claude Code
mkdir -p ~/.config/code-server/User
cat > ~/.config/code-server/User/settings.json << VSCODE
{
    "claude.apiKey": "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",
    "workbench.colorTheme": "Default Dark+",
    "editor.fontSize": 14
}
VSCODE

# Create startup script
cat > /workspace/start-all.sh << 'STARTSCRIPT'
#!/bin/bash
cd /workspace/app
code-server --bind-addr 0.0.0.0:8080 &
pm2 start npm --name "manufacturing-app" -- start
pm2 logs
STARTSCRIPT
chmod +x /workspace/start-all.sh

# Start everything
echo -e "${BLUE}→ Starting services...${NC}"
cd /workspace/app
pm2 start npm --name "manufacturing-app" -- start
code-server --bind-addr 0.0.0.0:8080 &

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ✅ Setup Complete!                             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "🌐 Access URLs:"
echo "   App: https://zopzt8o1vw2hfx-3000.proxy.runpod.net"
echo "   VS Code: https://zopzt8o1vw2hfx-8080.proxy.runpod.net"
echo "   Password: RunPod2024!"
echo ""
echo "🔧 Quick Commands:"
echo "   Check status: pm2 status"
echo "   View logs: pm2 logs"
echo "   Restart: pm2 restart all"
echo ""

# Keep script running
sleep 10