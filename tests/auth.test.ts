import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken } from '../lib/auth';

test('signToken and verifyToken should round-trip a valid admin payload', () => {
  const payload = {
    userId: 'user-1',
    companyId: 'company-1',
    email: 'admin@empresa-demo.com',
    role: 'ADMIN',
  };

  const token = signToken(payload);
  const decoded = verifyToken(token);

  assert.deepEqual(decoded, payload);
});

test('verifyToken should reject an invalid token', () => {
  const decoded = verifyToken('token-invalido');
  assert.equal(decoded, null);
});
