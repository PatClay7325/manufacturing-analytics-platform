import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const OAUTH_CLIENTS = {
  'manufacturing-analytics': {
    secret: process.env.OAUTH_CLIENT_SECRET!,
    redirectUris: ['http://localhost:3001/login/generic_oauth'],
  },
};

export async function GET(request: NextRequest, { params }: { params: { params: string[] } }) {
  const [action] = params.params;
  switch (action) {
    case 'authorize':
      return handleAuthorize(request);
    case 'token':
      return handleToken(request);
    case 'userinfo':
      return handleUserInfo(request);
    default:
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { params: string[] } }) {
  const [action] = params.params;
  if (action === 'token') {
    return handleToken(request);
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

async function handleAuthorize(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');

  if (!clientId || !OAUTH_CLIENTS[clientId]) {
    return NextResponse.json({ error: 'Invalid client' }, { status: 400 });
  }

  const code = jwt.sign(
    { userId: 'demo-user', clientId, type: 'authorization_code' },
    process.env.OAUTH_CLIENT_SECRET!,
    { expiresIn: '10m' }
  );

  const redirectUrl = new URL(redirectUri!);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state!);
  return NextResponse.redirect(redirectUrl.toString());
}

async function handleToken(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get('code');
  const clientId = formData.get('client_id');
  const clientSecret = formData.get('client_secret');

  if (!clientId || !clientSecret || clientSecret !== OAUTH_CLIENTS[clientId]?.secret) {
    return NextResponse.json({ error: 'Invalid client credentials' }, { status: 401 });
  }

  try {
    jwt.verify(code as string, process.env.OAUTH_CLIENT_SECRET!);
    const accessToken = jwt.sign(
      { sub: 'demo-user', email: 'admin@manufacturing.local', name: 'Demo Admin', role: 'admin' },
      process.env.OAUTH_CLIENT_SECRET!,
      { expiresIn: '1d' }
    );

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }
}

async function handleUserInfo(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(authHeader.substring(7), process.env.OAUTH_CLIENT_SECRET!) as any;
    return NextResponse.json({ sub: decoded.sub, email: decoded.email, name: decoded.name, role: decoded.role });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
