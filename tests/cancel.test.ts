import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canCancelAppointment } from '../lib/appointments/cancel';

describe('canCancelAppointment', () => {
  const now = new Date('2026-09-19T15:00:00Z'); // 12:00 em Brasília

  it('allows pending and confirmed appointments that have not ended', () => {
    assert.equal(canCancelAppointment({ status: 'CONFIRMED', date: '2026-09-19', endTime: '13:00' }, now), true);
    assert.equal(canCancelAppointment({ status: 'PENDING', date: '2026-09-20', endTime: '10:00' }, now), true);
  });

  it('blocks appointments that already ended', () => {
    assert.equal(canCancelAppointment({ status: 'CONFIRMED', date: '2026-09-19', endTime: '11:30' }, now), false);
    assert.equal(canCancelAppointment({ status: 'CONFIRMED', date: '2026-09-18', endTime: '18:00' }, now), false);
  });

  it('blocks appointments already closed', () => {
    for (const status of ['CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW']) {
      assert.equal(canCancelAppointment({ status, date: '2026-09-25', endTime: '10:00' }, now), false);
    }
  });
});
