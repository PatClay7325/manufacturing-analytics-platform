# 🔐 Manufacturing Analytics Platform - Demo Login Credentials

## Fixed Issues ✅

### 1. **Password Authentication Fixed**
- Updated demo user password hashes in database
- All demo users now have working passwords

### 2. **Audit Log Schema Fixed** 
- Removed invalid `user` relation from audit service
- Fixed Prisma schema mismatch causing errors

### 3. **Environment Variables Added**
- Added missing Grafana configuration
- Added JWT secret configuration
- Added Ollama service configuration

## Demo Login Credentials

### Admin User
- **Email**: `admin@example.com`
- **Password**: `demo123`
- **Role**: Admin
- **Permissions**: Full system access, user management, all features

### Operator User  
- **Email**: `operator@example.com`
- **Password**: `demo123`
- **Role**: Operator
- **Permissions**: Read/write access, alert management

### Analyst User
- **Email**: `analyst@example.com` 
- **Password**: `demo123`
- **Role**: Analyst
- **Permissions**: Read/write access, data analysis

## Manufacturing Domain Users

### System Administrator
- **Email**: `admin@manufacturing.com`
- **Password**: `admin123` (if seeded)
- **Role**: Admin

### Data Analyst
- **Email**: `analyst@manufacturing.com`  
- **Password**: `analyst123` (if seeded)
- **Role**: Analyst

### Machine Operator
- **Email**: `operator@manufacturing.com`
- **Password**: `operator123` (if seeded)
- **Role**: Operator

## How to Login

1. Navigate to: `http://localhost:3000/login`
2. Enter email and password from above
3. Click "Login"
4. You should be redirected to the dashboard

## Troubleshooting

### If login still fails:
1. Check server logs for specific errors
2. Verify database connection: `docker ps | grep postgres`
3. Verify user exists: 
   ```sql
   SELECT email, role FROM "User" WHERE email = 'admin@example.com';
   ```

### Password Reset (if needed):
Run this to reset all demo passwords to `demo123`:
```bash
node fix-demo-users.js
```

## Testing
You can test login functionality with:
```bash
node test-login.js
```

## Next Steps
1. ✅ Login with demo credentials  
2. ✅ Access dashboard
3. ✅ Test chat functionality
4. ✅ Verify manufacturing data queries

---
**Note**: These are demo credentials for development only. Change all passwords in production!