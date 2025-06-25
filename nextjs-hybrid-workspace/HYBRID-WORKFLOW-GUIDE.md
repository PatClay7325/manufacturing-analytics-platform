# 🔄 Hybrid Bolt.diy + Next.js Development Workflow

This guide outlines the complete workflow for using bolt.diy for rapid prototyping and Next.js for production-ready development.

## 🏗️ Architecture Overview

```
┌─────────────────┐    🔄 Port    ┌─────────────────┐
│   Bolt.diy      │    ──────→    │   Next.js       │
│   (Prototype)   │               │   (Production)  │
│                 │               │                 │
│ ✓ Rapid AI Gen  │               │ ✓ App Router    │
│ ✓ Quick Test    │               │ ✓ SSR/SSG       │
│ ✓ Iteration     │               │ ✓ Optimized     │
│ ✓ Remix-based   │               │ ✓ Scalable      │
└─────────────────┘               └─────────────────┘
```

## 📁 Directory Structure

```
manufacturing-analytics-platform/
├── nextjs-hybrid-workspace/
│   ├── nextjs-production/          # Production Next.js app
│   │   ├── src/
│   │   │   ├── app/               # Next.js App Router
│   │   │   ├── components/        # Ported components
│   │   │   ├── lib/               # Utilities and hooks
│   │   │   └── types/             # TypeScript definitions
│   │   ├── scripts/
│   │   │   ├── port-from-bolt.js  # Porting automation
│   │   │   └── sync-components.js # Live sync watcher
│   │   └── package.json
│   └── HYBRID-WORKFLOW-GUIDE.md   # This guide
└── (your existing project structure)

# Bolt.diy location (external)
C:\Users\pclay\bolt.diy/           # Rapid prototyping environment
```

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Navigate to the Next.js project
cd nextjs-hybrid-workspace/nextjs-production

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Configure bolt.diy path
export BOLT_DIY_PATH="/mnt/c/Users/pclay/bolt.diy"
```

### 2. Start Development Servers

```bash
# Terminal 1: Start Next.js development server
npm run dev

# Terminal 2: Start bolt.diy (in separate terminal)
cd /mnt/c/Users/pclay/bolt.diy
pnpm run dev:nextjs

# Terminal 3: Start component sync watcher (optional)
npm run sync-components watch
```

## 🔄 Development Workflow

### Phase 1: Prototype in Bolt.diy

1. **Open bolt.diy** at `http://localhost:5173`
2. **Generate components** using AI prompts:
   ```
   "Create a user authentication component with email/password login"
   "Build a dashboard with charts and KPI cards"
   "Generate a form for creating manufacturing orders"
   ```
3. **Test and iterate** quickly in bolt.diy environment
4. **Refine the component** until it meets requirements

### Phase 2: Port to Next.js

#### Automated Porting

```bash
# Port all components
npm run port-from-bolt all

# Port specific component types
npm run port-from-bolt ui      # UI components only
npm run port-from-bolt chat    # Chat components only
npm run port-from-bolt stores  # State management only
```

#### Manual Porting

```bash
# Port specific component
node scripts/port-from-bolt.js
```

#### Live Sync (for ongoing development)

```bash
# Watch for changes and auto-port
npm run sync-components watch
```

### Phase 3: Optimize for Next.js

1. **Review ported code** in `src/components/`
2. **Convert to Next.js patterns**:
   - Add `'use client'` for client components
   - Convert Remix loaders to Next.js data fetching
   - Update routing to use Next.js App Router
   - Replace Remix forms with Next.js Server Actions

3. **Test in Next.js environment**:
   ```bash
   npm run dev
   npm run type-check
   npm run lint
   ```

4. **Optimize performance**:
   - Add proper TypeScript types
   - Implement proper error boundaries
   - Add loading states
   - Optimize images and assets

## 🛠️ Porting Patterns

### Common Conversions

| Bolt.diy (Remix) | Next.js App Router |
|------------------|-------------------|
| `useLoaderData()` | `async function Page()` with data fetching |
| `export async function loader()` | Server Components or API routes |
| `export async function action()` | Server Actions or API routes |
| `Form` from Remix | `<form>` with Server Actions |
| `~/` path alias | `@/` path alias |

### Component Conversion Example

**Before (Bolt.diy/Remix):**
```tsx
// app/components/UserProfile.tsx
import { useLoaderData } from '@remix-run/react';

export default function UserProfile() {
  const user = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

export async function loader() {
  return await getUser();
}
```

**After (Next.js):**
```tsx
// src/components/UserProfile.tsx
interface User {
  name: string;
  email: string;
}

interface UserProfileProps {
  user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// In page component:
// async function UserPage() {
//   const user = await getUser();
//   return <UserProfile user={user} />;
// }
```

## 🎯 Best Practices

### 1. Prototyping in Bolt.diy

- **Focus on functionality** over perfect code structure
- **Iterate quickly** with AI assistance
- **Test core features** before porting
- **Document requirements** as you build

### 2. Porting to Next.js

- **Always review** ported code manually
- **Add proper TypeScript** types immediately
- **Test thoroughly** in Next.js environment
- **Follow Next.js conventions** for file structure

### 3. Production Optimization

- **Implement proper error handling**
- **Add loading states** and skeletons
- **Optimize for SEO** with proper metadata
- **Add proper testing** with Jest/Testing Library

## 🔧 Advanced Workflows

### Selective Component Sync

Create a `.syncconfig.json` to specify which components to auto-sync:

```json
{
  "watchComponents": [
    {
      "source": "app/components/ui/Button.tsx",
      "target": "src/components/ui/button.tsx",
      "autoSync": true
    },
    {
      "source": "app/components/chat/*.tsx",
      "target": "src/components/chat/",
      "autoSync": false
    }
  ]
}
```

### Custom Conversion Rules

Add custom conversion patterns in `scripts/port-from-bolt.js`:

```javascript
// Add to setupConversions() method
this.conversions.set(
  /your-custom-pattern/g,
  "replacement-pattern"
);
```

### Integration with Manufacturing Platform

Since you're working with a manufacturing analytics platform, you can:

1. **Port AI agents** from bolt.diy to your manufacturing platform
2. **Convert dashboard components** for production use
3. **Migrate chat interfaces** for manufacturing assistance
4. **Port visualization components** for analytics

## 📊 Monitoring and Quality

### Porting Reports

Each porting operation generates a detailed report:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "total": 15,
  "successful": 13,
  "failed": 2,
  "results": [...]
}
```

### Quality Checklist

After porting, ensure:

- [ ] TypeScript types are complete
- [ ] All imports resolve correctly  
- [ ] Components render without errors
- [ ] Client/Server boundaries are correct
- [ ] Performance is optimized
- [ ] Accessibility is maintained
- [ ] Tests are written and passing

## 🚀 Deployment

### Development
```bash
npm run dev          # Start Next.js dev server
npm run type-check   # Verify TypeScript
npm run lint         # Check code quality
```

### Production
```bash
npm run build        # Build for production
npm run start        # Start production server
npm run analyze      # Analyze bundle size
```

## 🔍 Troubleshooting

### Common Issues

1. **Import Resolution Errors**
   - Check path aliases in `tsconfig.json`
   - Verify file exists at expected location

2. **Hydration Mismatches**
   - Add `'use client'` to interactive components
   - Check for server/client state differences

3. **Missing Dependencies**
   - Install any bolt.diy dependencies needed
   - Update package.json as needed

4. **Performance Issues**
   - Use Next.js Image component for images
   - Implement proper lazy loading
   - Check bundle analyzer report

### Debug Commands

```bash
# Check what will be ported
npm run port-from-bolt list

# Verbose porting with logs
DEBUG=1 npm run port-from-bolt all

# Test specific component
npm run test UserProfile
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Bolt.diy Documentation](https://bolt.diy/docs)
- [Manufacturing Analytics Platform Docs](../README.md)

---

## 🎉 Success! 

You now have a complete hybrid development workflow that combines the rapid prototyping power of bolt.diy with the production-ready capabilities of Next.js 14+.

Happy coding! 🚀