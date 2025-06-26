# CRITICAL PROJECT REQUIREMENTS - MUST READ

## 🚨 ABSOLUTE REQUIREMENT: NO MOCK DATA 🚨

**THIS IS THE #1 RULE FOR THIS PROJECT**

### NEVER USE MOCK DATA
- **NO** mock responses
- **NO** sample data
- **NO** simulated data
- **NO** generated test data
- **NO** hardcoded example data

### ONLY USE REAL DATA
- ✅ **ONLY** real data from TimescaleDB/PostgreSQL database
- ✅ **ONLY** actual production data queries
- ✅ **ONLY** live database connections

### WHY THIS MATTERS
This is a Proof of Concept (POC) to demonstrate real-world manufacturing analytics capabilities. Using mock data **DESTROYS THE ENTIRE PURPOSE** of the POC. The client needs to see actual data from their systems.

### BEFORE MAKING ANY CHANGES
1. **CHECK**: Is this using real database queries?
2. **CHECK**: Am I removing or bypassing database calls?
3. **CHECK**: Am I adding any hardcoded data?
4. **CHECK**: Am I using any "sample" or "example" functions?

### IF YOU SEE MOCK DATA
1. **STOP** immediately
2. **REMOVE** the mock data
3. **REPLACE** with real database queries
4. **VERIFY** data comes from PostgreSQL/TimescaleDB

### DATABASE CONNECTION
- Database: PostgreSQL with TimescaleDB
- Port: 5433
- Database name: manufacturing
- Schema: public
- All data MUST come from this database

### FORBIDDEN PATTERNS
Never use functions or variables containing:
- mock
- fake
- sample
- dummy
- test
- simulated
- generated
- example

### VERIFICATION CHECKLIST
Before committing any code:
- [ ] No mock data imports
- [ ] No sample data functions
- [ ] All data from database queries
- [ ] No hardcoded responses
- [ ] Real-time data only

## Project Overview

This is a Manufacturing Analytics Platform POC that demonstrates:
- Real-time equipment monitoring
- OEE (Overall Equipment Effectiveness) calculations
- Production analytics
- Quality metrics
- Downtime analysis
- Predictive maintenance

All features MUST use real data from the TimescaleDB database.

## Key Technologies
- Next.js 15.1.4
- TypeScript
- Prisma ORM
- PostgreSQL with TimescaleDB
- Real-time data only

## Remember
**Every line of code must support the goal of showing REAL manufacturing data and analytics. Mock data is NEVER acceptable.**