# 🚀 Quick Setup Instructions

## Run These Commands in Order:

### 1. Complete Setup (Run This First!)
```cmd
COMPLETE-SETUP.cmd
```

This will:
- Create your `.env.local` with optimized settings
- Start Ollama with Gemma:2B
- Configure everything for streaming
- Verify the setup

### 2. Edit Database Configuration
Open `.env.local` and update these lines with your actual database credentials:
```
DATABASE_URL="postgresql://username:password@localhost:5432/manufacturing"
DIRECT_URL="postgresql://username:password@localhost:5432/manufacturing"
```

### 3. Start Your Development Server
```bash
npm run dev
```

### 4. Test the Optimized Chat
Open your browser to:
```
http://localhost:3000/manufacturing-chat/optimized
```

### 5. Verify Everything is Working
```cmd
VERIFY-SETUP.cmd
```

## What You'll See:

1. **Streaming Responses** - Text appears word by word
2. **Fast Performance** - Optimized for low resources
3. **Progress Indicator** - Shows generation progress
4. **Cancel Button** - Stop generation anytime

## If Something Goes Wrong:

### Ollama Not Starting?
```cmd
# Check Docker is running
docker --version

# Start Ollama manually
docker-compose up -d ollama

# Check logs
docker logs manufacturing-ollama
```

### Gemma:2B Not Found?
```cmd
# Pull the model manually
docker exec manufacturing-ollama ollama pull gemma:2b
```

### Performance Issues?
```cmd
# Monitor performance
scripts\windows\MONITOR-OLLAMA-PERFORMANCE.cmd
```

## Success Checklist:
- [ ] Docker Desktop is running
- [ ] COMPLETE-SETUP.cmd ran without errors
- [ ] .env.local has your database credentials
- [ ] npm run dev starts without errors
- [ ] Chat page loads at /manufacturing-chat/optimized
- [ ] Messages stream in real-time

---

**That's it! Your optimized streaming chat is ready to use!** 🎉