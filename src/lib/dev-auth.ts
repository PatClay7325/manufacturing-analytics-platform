/**
 * Development-only authentication bypass
 * This file provides automatic login for development environments
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const DEV_USER = {
  id: 'dev-admin',
  email: 'admin@manufacturing.com',
  name: 'Development Admin',
  role: 'admin',
  permissions: ['admin', 'read', 'write', 'manage_users', 'manage_teams', 'manage_alerts', 'manage_datasources']
};

export function generateDevToken() {
  return jwt.sign(
    {
      userId: DEV_USER.id,
      email: DEV_USER.email,
      role: DEV_USER.role,
      name: DEV_USER.name,
      sessionId: 'dev-session',
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Long expiration for dev
  );
}

export function isDevMode() {
  return process.env.NODE_ENV === 'development';
}