import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'development-secret';

export type AuthTokenPayload = {
  userId: string;
  companyId: string;
  email: string;
  role: string;
};

function base64UrlEncode(value: Buffer | string) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url');
}

function signPayload(payload: string) {
  return createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
}

export function signToken(payload: AuthTokenPayload) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;

    const expected = signPayload(`${header}.${payload}`);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== actualBuffer.length) return null;

    const isValid = timingSafeEqual(expectedBuffer, actualBuffer);
    if (!isValid) return null;

    const parsed = JSON.parse(base64UrlDecode(payload).toString('utf8')) as AuthTokenPayload;
    return parsed;
  } catch {
    return null;
  }
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function createPasswordResetToken() {
  return randomBytes(32).toString('hex');
}

export function hashPasswordResetToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex');
}
