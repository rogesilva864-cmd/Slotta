import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appointmentEndsAt, isReviewDue, isReviewDue as due, isValidReviewDelay, isValidReviewUrl } from '../lib/reviews/service';

describe('isValidReviewUrl', () => {
  it('accepts https links and rejects everything else', () => {
    assert.equal(isValidReviewUrl('https://g.page/r/abc123/review'), true);
    assert.equal(isValidReviewUrl('https://search.google.com/local/writereview?placeid=XYZ'), true);
    assert.equal(isValidReviewUrl('http://g.page/r/abc/review'), false);
    assert.equal(isValidReviewUrl('javascript:alert(1)'), false);
    assert.equal(isValidReviewUrl('g.page/r/abc'), false);
    assert.equal(isValidReviewUrl(''), false);
    assert.equal(isValidReviewUrl('https://' + 'a'.repeat(600) + '.com'), false);
  });
});

describe('isValidReviewDelay', () => {
  it('only allows the offered options', () => {
    for (const minutes of [60, 120, 240, 1440]) assert.equal(isValidReviewDelay(minutes), true);
    assert.equal(isValidReviewDelay(5), false);
    assert.equal(isValidReviewDelay(0), false);
  });
});

describe('isReviewDue', () => {
  const endsAt = appointmentEndsAt('2026-09-19', '15:00'); // 15:00 -03:00 = 18:00Z

  it('is not due before the delay has passed', () => {
    const now = new Date('2026-09-19T19:30:00Z'); // 16:30 local, 90 min after
    assert.equal(isReviewDue({ endsAt, delayMinutes: 120, now }), false);
  });

  it('is due once the delay has passed', () => {
    const now = new Date('2026-09-19T20:05:00Z'); // 17:05 local, 125 min after
    assert.equal(due({ endsAt, delayMinutes: 120, now }), true);
  });

  it('does not blast old history after the lookback window', () => {
    const now = new Date('2026-09-22T20:00:00Z'); // 3 days later
    assert.equal(isReviewDue({ endsAt, delayMinutes: 120, now }), false);
  });
});
