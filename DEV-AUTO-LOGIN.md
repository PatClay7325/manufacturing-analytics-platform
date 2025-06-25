# Development Auto-Login Setup

## Quick Setup

1. Add this to your `.env.local` file:
```
NEXT_PUBLIC_DEV_AUTO_LOGIN=true
NODE_ENV=development
```

2. Restart the development server:
```bash
npm run dev
```

## How It Works

- In development mode, the middleware automatically creates and sets an auth cookie
- The `/api/auth/me` endpoint recognizes dev tokens and returns a dev admin user
- All protected routes will automatically work without login

## Security Warning

⚠️ **NEVER use this in production!** This completely bypasses authentication for development convenience only.

## Default Dev User

- Email: `admin@manufacturing.com`
- Name: `Development Admin`
- Role: `admin`
- Permissions: Full admin access

## Troubleshooting

If auto-login isn't working:

1. Check that `NODE_ENV=development` in your `.env.local`
2. Check that `NEXT_PUBLIC_DEV_AUTO_LOGIN=true` is set
3. Clear your browser cookies and refresh
4. Check the browser console for any errors

## Manual Login (if needed)

If you need to test the actual login flow, you can:
1. Set `NEXT_PUBLIC_DEV_AUTO_LOGIN=false`
2. Create a test user in the database
3. Use the normal login flow