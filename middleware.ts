import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function verifySessionToken(token: string) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return false;

    const secret = (process.env.AUTH_SECRET || 'development-secret') as string;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const data = encoder.encode(`${header}.${payload}`);
    const signed = await crypto.subtle.sign('HMAC', key, data);
    const expected = btoa(String.fromCharCode(...new Uint8Array(signed)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    if (expected !== signature) return false;

    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return parsed.role === 'ADMIN' && Boolean(parsed.email);
  } catch {
    return false;
  }
}

/** Manda para o login guardando o destino (ex.: link de notificação com ?agendamento=). */
function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/admin/login', request.url);
  const { pathname, search } = request.nextUrl;
  if (search) loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session_token')?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  const isValid = await verifySessionToken(token);

  if (!isValid) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
