import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { peekRateLimit, recordHit, resetRateLimit, takeRateLimit } from '../lib/rate-limit';

const options = { limit: 3, windowMs: 1000 };

describe('rate limit', () => {
  it('blocks after the limit and reports when to retry', () => {
    const key = 'test:block';
    const t0 = 1_000_000;
    assert.equal(takeRateLimit(key, options, t0).allowed, true);
    assert.equal(takeRateLimit(key, options, t0 + 10).allowed, true);
    assert.equal(takeRateLimit(key, options, t0 + 20).allowed, true);

    const blocked = takeRateLimit(key, options, t0 + 30);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 1);
  });

  it('allows again once the window has passed', () => {
    const key = 'test:window';
    const t0 = 2_000_000;
    for (let i = 0; i < 3; i += 1) takeRateLimit(key, options, t0 + i);
    assert.equal(takeRateLimit(key, options, t0 + 500).allowed, false);
    assert.equal(takeRateLimit(key, options, t0 + 1100).allowed, true);
  });

  it('keeps keys independent', () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 3; i += 1) takeRateLimit('test:a', options, t0);
    assert.equal(takeRateLimit('test:a', options, t0).allowed, false);
    assert.equal(takeRateLimit('test:b', options, t0).allowed, true);
  });

  it('peek does not consume and recordHit counts failures only', () => {
    const key = 'test:peek';
    const t0 = 4_000_000;
    for (let i = 0; i < 5; i += 1) assert.equal(peekRateLimit(key, options, t0).allowed, true);
    for (let i = 0; i < 3; i += 1) recordHit(key, options.windowMs, t0);
    assert.equal(peekRateLimit(key, options, t0).allowed, false);
    resetRateLimit(key);
    assert.equal(peekRateLimit(key, options, t0).allowed, true);
  });
});
