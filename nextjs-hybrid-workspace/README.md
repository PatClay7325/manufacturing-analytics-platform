# 🔄 Hybrid Bolt.diy + Next.js Development Workspace

Complete hybrid development environment combining **bolt.diy** for rapid AI-powered prototyping with **Next.js 14+** for production-ready applications.

## ⚡ Quick Start

```bash
# Run the automated setup
./setup-hybrid-workflow.sh

# Start development servers
cd nextjs-production
npm run dev                              # Next.js (http://localhost:3000)

# In separate terminal:
cd /mnt/c/Users/pclay/bolt.diy
pnpm run dev:nextjs                      # Bolt.diy (http://localhost:5173)

# Optional: Auto-sync components
npm run sync-components watch
```

## 🏗️ What's Included

### ✅ **Complete Next.js 14+ Setup**
- App Router with TypeScript
- Tailwind CSS with shadcn/ui components
- Optimized configurations for production
- ESLint, Prettier, and testing setup

### ✅ **Automated Porting Tools**
- `port-from-bolt.js` - Convert Remix patterns to Next.js
- `sync-components.js` - Live sync watcher for changes
- Smart pattern recognition and conversion
- Detailed porting reports

### ✅ **Production-Ready Architecture**
- Next.js 14+ with App Router
- Server Actions and Server Components
- Optimized builds and deployment ready
- Proper TypeScript configurations

### ✅ **Seamless Integration**
- Shared component library patterns
- Compatible styling systems
- Environment variable management
- Path alias mappings

## 📁 Project Structure

```
nextjs-hybrid-workspace/
├── nextjs-production/              # Production Next.js application
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   ├── components/ui/         # Ported UI components
│   │   ├── lib/                   # Shared utilities
│   │   └── types/                 # TypeScript definitions
│   ├── scripts/
│   │   ├── port-from-bolt.js      # Automated porting
│   │   └── sync-components.js     # Live sync watcher
│   └── package.json               # Next.js dependencies
├── HYBRID-WORKFLOW-GUIDE.md       # Complete workflow documentation
└── setup-hybrid-workflow.sh       # Automated setup script
```

## 🔄 Development Workflow

### 1. **Prototype** in Bolt.diy
```
💡 Generate features with AI assistance
🔧 Test and iterate quickly
✨ Refine until requirements are met
```

### 2. **Port** to Next.js
```bash
# Automated porting
npm run port-from-bolt all

# Live sync for ongoing development
npm run sync-components watch
```

### 3. **Optimize** for Production
```
🎯 Convert to Next.js patterns
⚡ Add performance optimizations  
🧪 Write tests and documentation
🚀 Deploy with confidence
```

## 🛠️ Available Commands

### Next.js Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run type-check       # TypeScript validation
npm run lint             # Code quality check
npm run test             # Run tests
```

### Component Porting
```bash
npm run port-from-bolt all    # Port all components
npm run port-from-bolt ui     # Port UI components only
npm run port-from-bolt chat   # Port chat components only
npm run sync-components watch # Live sync watcher
npm run sync-components sync  # One-time sync
```

## 🎯 Key Features

### **Smart Pattern Conversion**
- Remix → Next.js App Router patterns
- Automatic `'use client'` directive injection
- Server Actions conversion from Remix actions
- Path alias updates (`~/` → `@/`)

### **Component Compatibility**
- Shared design system with Tailwind CSS
- Compatible component patterns
- Consistent TypeScript interfaces
- Unified styling approach

### **Development Experience**
- Hot module reloading in both environments
- Live component syncing
- Detailed porting reports
- Error handling and recovery

## 🚀 Production Optimizations

The Next.js application includes:

- **Performance**: Bundle optimization, code splitting, image optimization
- **SEO**: Proper metadata, server-side rendering, structured data
- **Security**: Content Security Policy, secure headers, input validation
- **Monitoring**: Error boundaries, performance monitoring, analytics ready
- **Deployment**: Vercel/Netlify ready, Docker support, CI/CD configs

## 📊 Quality Assurance

### **Automated Checks**
- TypeScript strict mode
- ESLint with Next.js rules
- Prettier code formatting
- Jest testing framework
- Component testing with Testing Library

### **Porting Validation**
- Syntax error detection
- Import resolution checking
- Component render testing
- Performance impact analysis

## 🔧 Configuration

### **Environment Variables**
```bash
# .env.local
BOLT_DIY_PATH=/mnt/c/Users/pclay/bolt.diy
NEXT_PUBLIC_APP_NAME="Your App Name"
OPENAI_API_KEY=your_api_key
ANTHROPIC_API_KEY=your_api_key
```

### **Path Aliases**
```typescript
// tsconfig.json paths
{
  "@/*": ["./src/*"],
  "@/components/*": ["./src/components/*"],
  "@/lib/*": ["./src/lib/*"],
  "@bolt/*": ["/mnt/c/Users/pclay/bolt.diy/app/*"]
}
```

## 📚 Resources

- **[Complete Workflow Guide](./HYBRID-WORKFLOW-GUIDE.md)** - Detailed development process
- **[Next.js 14 Documentation](https://nextjs.org/docs)** - Official Next.js docs
- **[Bolt.diy Setup Guide](https://github.com/stackblitz/bolt.new)** - Bolt.diy configuration
- **[Manufacturing Platform Integration](../README.md)** - Your existing project docs

## 🤝 Integration with Manufacturing Platform

This hybrid workspace is designed to work alongside your existing manufacturing analytics platform:

- **Port AI agents** for manufacturing intelligence
- **Convert dashboard components** for production analytics
- **Migrate chat interfaces** for manufacturing assistance
- **Share component libraries** across projects

## 🆘 Support

### **Common Issues**
1. **Import errors**: Check path aliases in `tsconfig.json`
2. **Hydration mismatches**: Add `'use client'` directives
3. **Build failures**: Review porting report for issues
4. **Sync problems**: Verify `BOLT_DIY_PATH` environment variable

### **Getting Help**
- Check the [workflow guide](./HYBRID-WORKFLOW-GUIDE.md) for detailed instructions
- Review porting reports in `porting-report.json`
- Use `DEBUG=1` environment variable for verbose logging

---

## ✨ Success!

You now have a complete hybrid development environment that combines:
- 🚀 **Rapid prototyping** with AI assistance in bolt.diy
- ⚡ **Production-ready** Next.js 14+ application
- 🔄 **Automated porting** between environments
- 📈 **Scalable architecture** for manufacturing analytics

**Happy hybrid development!** 🎉