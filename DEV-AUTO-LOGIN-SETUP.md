# 🚀 Development Auto-Login Setup

## Overview
I've configured the application to automatically log you in as an admin user during development. This bypasses all database authentication issues while you're developing.

## How It Works

1. **Environment Variable**: `NEXT_PUBLIC_DEV_AUTO_LOGIN="true"` in `.env.local`
2. **Auto Authentication**: The AuthContext automatically logs you in on page load
3. **Dev Token**: A special development token is generated that bypasses database checks
4. **API Support**: The `/api/auth/me` endpoint recognizes dev tokens

## Features

### Automatic Login
- When you open the app, you're automatically logged in as admin
- No need to click login buttons or enter credentials
- Works even if the database connection is broken

### Full Admin Access
- Role: `admin`
- All permissions enabled
- Access to all features and pages

### Development Only
- Only works when `NODE_ENV="development"`
- Only works when `NEXT_PUBLIC_DEV_AUTO_LOGIN="true"`
- Production builds ignore this completely

## Usage

1. **Just refresh the page** - You'll be automatically logged in
2. **Check the console** - You'll see:
   ```
   🔐 Development auto-login enabled
   🚀 Performing development auto-login...
   ✅ Auto-login successful!
   ```

## To Disable

If you want to test real authentication:
1. Set `NEXT_PUBLIC_DEV_AUTO_LOGIN="false"` in `.env.local`
2. Restart the dev server

## Benefits

- ✅ No more login issues during development
- ✅ Instant access to all features
- ✅ Works regardless of database status
- ✅ Speeds up development workflow
- ✅ No security risk (dev only)

The auto-login is now active. Just refresh your browser and you'll be logged in automatically!