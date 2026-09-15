import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEndTime } from '../lib/availability';

describe('calculateEndTime', () => {
  it('adds duration minutes to the start time', () => {
    assert.equal(calculateEndTime('09:30', 30), '10:00');
    assert.equal(calculateEndTime('14:00', 50), '14:50');
  });
});
