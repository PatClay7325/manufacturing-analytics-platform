# 🛡️ Schema Protection Guide

## Overview

The Manufacturing Analytics Platform uses a **Schema Protection System** to prevent accidental modifications to the production database schema during development. This ensures data integrity and prevents Claude Code or other tools from destroying the carefully crafted production schema.

## 🔒 Protection Mechanism

### Schema Files Structure
```
prisma/
├── schema.prisma                    # Active schema (managed by protection system)
├── schema.production.locked.prisma  # LOCKED production schema - DO NOT MODIFY
├── schema.development.prisma        # Safe development schema
├── .schema.lock                     # Protection metadata
└── generated/
    ├── production-client/           # Production Prisma client
    └── dev-client/                  # Development Prisma client
```

### Protection Levels

| File | Protection | Purpose | Can Modify |
|------|------------|---------|------------|
| `schema.production.locked.prisma` | 🔒 **LOCKED** | Production schema | ❌ **NO** |
| `schema.development.prisma` | 🔧 **UNLOCKED** | Development schema | ✅ **YES** |
| `schema.prisma` | 🤖 **MANAGED** | Active schema | ⚙️ **AUTO** |

## 📋 Available Commands

### Basic Schema Management

```bash
# Check current protection status
npm run schema:status

# Lock production schema (use for production)
npm run schema:lock

# Switch to development schema (safe for modifications)
npm run schema:dev

# Verify schema integrity
npm run schema:verify

# Auto-fix schema if compromised
npm run schema:verify:fix

# Clean up old schema files
npm run schema:cleanup
```

### Development Workflow

```bash
# Start development with dev schema
npm run dev:db

# Prepare for production deployment
npm run prod:prepare

# Protected Prisma commands (auto-verify schema)
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:push
```

## 🔧 Usage Scenarios

### Scenario 1: Safe Development
When you want to modify the schema for development/testing:

```bash
# Switch to development mode
npm run schema:dev

# Now you can safely modify schema.prisma
# Prisma commands will use development schema

# Start development server
npm run dev:db
```

### Scenario 2: Production Deployment
When deploying to production:

```bash
# Lock production schema
npm run schema:lock

# Prepare for deployment
npm run prod:prepare

# Deploy
npm run build
```

### Scenario 3: Schema Integrity Check
Verify that production schema hasn't been compromised:

```bash
# Check status
npm run schema:status

# Verify integrity
npm run schema:verify

# Auto-fix if needed
npm run schema:verify:fix
```

## 🚨 Protection Alerts

The system provides several levels of protection alerts:

### ✅ Protected Status
```
📊 Schema Protection Status

Status: PROTECTED 🔒
Schema: PRODUCTION
Version: 1.0.0-PRODUCTION
Locked: 6/25/2024, 10:30:00 AM
Integrity: VERIFIED ✅
```

### ⚠️ Development Mode
```
📊 Schema Protection Status

Status: DEVELOPMENT 🔧
Schema: DEVELOPMENT
Switched: 6/25/2024, 10:35:00 AM
```

### ❌ Integrity Violation
```
📊 Schema Protection Status

Status: PROTECTED 🔒
Schema: PRODUCTION
Integrity: COMPROMISED ❌

🚨 SCHEMA INTEGRITY VIOLATION DETECTED!
Production schema has been modified without authorization
```

## 🔐 Security Features

### Hash-Based Integrity
- Production schema is protected with SHA-256 hash verification
- Any unauthorized modification is immediately detected
- Auto-restore capability prevents permanent damage

### Automatic Protection
- Pre-commit hooks verify schema integrity
- Protected Prisma commands automatically verify schema
- Development mode prevents accidental production modifications

### Audit Trail
- All schema changes are logged with timestamps
- Protection status changes are tracked
- Version information is maintained

## 🚫 What NOT to Do

### ❌ NEVER Modify These Files Directly:
```
prisma/schema.production.locked.prisma  # Will break production
prisma/.schema.lock                     # Will break protection
```

### ❌ NEVER Use These Commands in Production Mode:
```bash
prisma db push          # Use npm run db:push instead
prisma generate         # Use npm run db:generate instead
prisma migrate dev      # Use npm run db:migrate instead
```

### ❌ NEVER Ignore Integrity Warnings:
```
❌ SCHEMA INTEGRITY VIOLATION DETECTED!
# This means production schema was compromised - FIX IMMEDIATELY
```

## ✅ Best Practices

### Development Workflow
1. **Always start with**: `npm run schema:dev`
2. **Make changes to**: `schema.prisma` (now safe)
3. **Test thoroughly** in development mode
4. **Switch back before deployment**: `npm run schema:lock`

### Production Deployment
1. **Verify integrity**: `npm run schema:verify`
2. **Lock schema**: `npm run schema:lock`
3. **Build project**: `npm run prod:prepare`
4. **Deploy safely**

### Regular Maintenance
1. **Check status weekly**: `npm run schema:status`
2. **Clean old files**: `npm run schema:cleanup`
3. **Verify integrity**: `npm run schema:verify`

## 🆘 Emergency Recovery

### If Production Schema is Compromised:
```bash
# Immediate recovery
npm run schema:verify:fix

# Or manual recovery
npm run schema:lock
npm run db:generate
```

### If Protection System is Broken:
```bash
# Reset protection system
rm prisma/.schema.lock
npm run schema:lock
```

### If Development is Stuck:
```bash
# Force development mode
npm run schema:dev
npm run db:generate
```

## 📞 Troubleshooting

### Problem: "Schema integrity violation"
**Solution**: 
```bash
npm run schema:verify:fix
```

### Problem: "Cannot find schema file"
**Solution**:
```bash
npm run schema:lock  # Restore production schema
```

### Problem: "Prisma client not generated"
**Solution**:
```bash
npm run schema:status  # Check mode
npm run db:generate   # Generate client
```

### Problem: "Development changes lost"
**Solution**:
- Development changes should be in `schema.development.prisma`
- Production schema is intentionally protected
- Use `npm run schema:dev` before making changes

## 🎯 Summary

The Schema Protection System ensures:

- 🛡️ **Production schema safety** - Cannot be accidentally modified
- 🔧 **Development flexibility** - Safe environment for schema changes  
- 🔍 **Integrity monitoring** - Automatic detection of unauthorized changes
- ⚡ **Quick recovery** - Auto-restore capabilities
- 📊 **Audit trail** - Complete history of schema protection events

**Remember**: When in doubt, run `npm run schema:status` to see current protection state!