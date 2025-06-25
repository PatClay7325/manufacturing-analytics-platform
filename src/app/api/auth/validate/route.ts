import { NextRequest } from 'next/server';
import { authValidationHandler } from '@/middleware/auth-proxy';

/**
 * Auth validation endpoint for Nginx auth_request
 * Returns 200 with auth headers if valid, 401 if not
 */
export async function GET(request: NextRequest) {
  return authValidationHandler(request);
}

export async function POST(request: NextRequest) {
  return authValidationHandler(request);
}