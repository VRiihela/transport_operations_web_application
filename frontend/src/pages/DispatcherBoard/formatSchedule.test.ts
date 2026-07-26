import { describe, it, expect } from 'vitest';
import { formatSchedule, ScheduleFields } from './formatSchedule';

// This frontend project has no @types/node; declare just enough of the
// global to set TZ below without pulling in a new dependency.
declare const process: { env: Record<string, string | undefined> };

// Force local-time computations (toHHMM uses Date#getHours/getMinutes) onto a
// fixed, known offset so the literal HH:MM assertions below are deterministic
// regardless of the host/CI machine's system timezone.
process.env.TZ = 'UTC';

function makeJob(overrides: Partial<ScheduleFields>): ScheduleFields {
  return {
    scheduledStart: null,
    scheduledEnd: null,
    scheduleType: null,
    schedulingNote: null,
    ...overrides,
  };
}

const START_ISO = '2024-06-01T09:00:00';
const END_WINDOW_ISO = '2024-06-01T11:00:00';
const END_DURATION_ISO = '2024-06-01T15:00:00';
const END_90MIN_ISO = '2024-06-01T10:30:00';

describe('formatSchedule', () => {
  // ── TBC branch ────────────────────────────────────────────────────────────

  it('returns schedulingNote as primary with label TBC when both times are null and note is present', () => {
    const result = formatSchedule(makeJob({ schedulingNote: 'Pending quote' }));
    expect(result).toEqual({ primary: 'Pending quote', label: 'TBC' });
  });

  it('returns literal TBC as primary when both times are null and schedulingNote is null', () => {
    const result = formatSchedule(makeJob({}));
    expect(result).toEqual({ primary: 'TBC', label: 'TBC' });
  });

  // ── Fixed time branch (scheduledEnd null) ──────────────────────────────────

  it('returns fixed single time when scheduledEnd is null, regardless of scheduleType WINDOW', () => {
    const result = formatSchedule(makeJob({ scheduledStart: START_ISO, scheduleType: 'WINDOW' }));
    expect(result).toEqual({ primary: '09:00', label: 'kiinteä aika' });
  });

  it('returns fixed single time when scheduledEnd is null and scheduleType is null', () => {
    const result = formatSchedule(makeJob({ scheduledStart: START_ISO }));
    expect(result).toEqual({ primary: '09:00', label: 'kiinteä aika' });
  });

  it('returns fixed single time when scheduledEnd is null and scheduleType is DURATION', () => {
    const result = formatSchedule(makeJob({ scheduledStart: START_ISO, scheduleType: 'DURATION' }));
    expect(result).toEqual({ primary: '09:00', label: 'kiinteä aika' });
  });

  // ── Window branch ───────────────────────────────────────────────────────────

  it('returns arrival window range with en dash and label saapumisaika for WINDOW', () => {
    const result = formatSchedule(
      makeJob({ scheduledStart: START_ISO, scheduledEnd: END_WINDOW_ISO, scheduleType: 'WINDOW' })
    );
    expect(result).toEqual({ primary: '09:00–11:00', label: 'saapumisaika' });
  });

  it('uses an en dash (U+2013) not a hyphen in window primary', () => {
    const result = formatSchedule(
      makeJob({ scheduledStart: START_ISO, scheduledEnd: END_WINDOW_ISO, scheduleType: 'WINDOW' })
    );
    expect(result.primary).toBe('09:00–11:00');
  });

  // ── Duration branch ───────────────────────────────────────────────────────

  it('returns duration range with arrow, computed whole hours, and label kesto for DURATION', () => {
    const result = formatSchedule(
      makeJob({ scheduledStart: START_ISO, scheduledEnd: END_DURATION_ISO, scheduleType: 'DURATION' })
    );
    expect(result).toEqual({ primary: '09:00 → 15:00', label: 'kesto · 6 h' });
  });

  it('rounds a 90-minute duration to 2 h', () => {
    const result = formatSchedule(
      makeJob({ scheduledStart: START_ISO, scheduledEnd: END_90MIN_ISO, scheduleType: 'DURATION' })
    );
    expect(result).toEqual({ primary: '09:00 → 10:30', label: 'kesto · 2 h' });
  });

  // ── FIXED / null scheduleType with both times present ──────────────────────

  it('returns fixed single time for scheduleType FIXED when both times are present', () => {
    const result = formatSchedule(
      makeJob({ scheduledStart: START_ISO, scheduledEnd: END_WINDOW_ISO, scheduleType: 'FIXED' })
    );
    expect(result).toEqual({ primary: '09:00', label: 'kiinteä aika' });
  });

  it('returns fixed single time when scheduleType is null and both times are present', () => {
    const result = formatSchedule(
      makeJob({ scheduledStart: START_ISO, scheduledEnd: END_WINDOW_ISO, scheduleType: null })
    );
    expect(result).toEqual({ primary: '09:00', label: 'kiinteä aika' });
  });

  // ── Degenerate data: only scheduledEnd set ─────────────────────────────────

  it('falls back to scheduledEnd as the range start when scheduledStart is null but scheduledEnd is set', () => {
    const result = formatSchedule(
      makeJob({ scheduledStart: null, scheduledEnd: END_WINDOW_ISO, scheduleType: 'WINDOW' })
    );
    expect(result).toEqual({ primary: '11:00–11:00', label: 'saapumisaika' });
  });
});
