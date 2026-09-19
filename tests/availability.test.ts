import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEndTime } from '../lib/availability';

describe('calculateEndTime', () => {
  it('adds duration minutes to the start time', () => {
    assert.equal(calculateEndTime('09:30', 30), '10:00');
    assert.equal(calculateEndTime('14:00', 50), '14:50');
  });
});

import { brazilNowParts, isSlotInPast } from '../lib/availability';

describe('past slots', () => {
  // 2026-09-19 15:10 UTC = 12:10 em Brasília
  const now = new Date('2026-09-19T15:10:00Z');

  it('reads the current time in Brasilia', () => {
    assert.deepEqual(brazilNowParts(now), { date: '2026-09-19', minutes: 12 * 60 + 10 });
  });

  it('hides slots that already started today', () => {
    assert.equal(isSlotInPast('2026-09-19', 9 * 60, now), true);
    assert.equal(isSlotInPast('2026-09-19', 12 * 60, now), true);
    assert.equal(isSlotInPast('2026-09-19', 12 * 60 + 30, now), false);
  });

  it('keeps future days open and closes past days', () => {
    assert.equal(isSlotInPast('2026-09-20', 8 * 60, now), false);
    assert.equal(isSlotInPast('2026-09-18', 18 * 60, now), true);
  });

  it('uses Brasilia date near midnight UTC', () => {
    const lateNight = new Date('2026-09-20T01:30:00Z'); // 22:30 do dia 19 em Brasília
    assert.equal(brazilNowParts(lateNight).date, '2026-09-19');
    assert.equal(isSlotInPast('2026-09-19', 23 * 60, lateNight), false);
  });
});
