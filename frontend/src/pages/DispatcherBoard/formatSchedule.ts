import { Job } from './types';

export type ScheduleFields = Pick<Job, 'scheduleType' | 'scheduledStart' | 'scheduledEnd' | 'schedulingNote'>;

export interface FormatScheduleResult {
  primary: string;
  label: string;
}

/**
 * Formats the time portion of an ISO datetime string as "HH:MM".
 * Renders in the browser's local timezone — this is intended: the database
 * stores UTC, and the dispatcher reads times converted to local (Helsinki) time.
 */
function toHHMM(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Whole-hour difference between two ISO datetime strings, rounded. */
function diffWholeHours(startIso: string, endIso: string): number {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  return Math.round((endMs - startMs) / (1000 * 60 * 60));
}

/**
 * Pure formatting helper — no React or Axios imports.
 *
 * Priority order:
 *   1. Both scheduledStart and scheduledEnd null → TBC
 *   2. scheduledEnd null (scheduledStart set)     → fixed single time, regardless of scheduleType
 *   3. scheduleType WINDOW                        → arrival window range with en dash
 *   4. scheduleType DURATION                      → range with arrow and computed whole hours
 *   5. scheduleType FIXED (or null/undefined)     → fixed single time
 */
export function formatSchedule(job: ScheduleFields): FormatScheduleResult {
  const { scheduledStart, scheduledEnd, scheduleType, schedulingNote } = job;

  // Branch 1: both times absent → TBC
  if (scheduledStart == null && scheduledEnd == null) {
    return {
      primary: schedulingNote ?? 'TBC',
      label: 'TBC',
    };
  }

  // Branch 2: end absent → fixed single time (legacy rows, or genuinely fixed)
  if (scheduledEnd == null) {
    if (scheduledStart == null) {
      // Unreachable — branch 1 already covers both-null — but satisfies the type checker.
      return { primary: 'TBC', label: 'TBC' };
    }
    return {
      primary: toHHMM(scheduledStart),
      label: 'kiinteä aika',
    };
  }

  // From here scheduledEnd is a non-null string; scheduledStart may still be
  // null in a degenerate data state (only end set) — fall back to end as start.
  const start = scheduledStart ?? scheduledEnd;

  switch (scheduleType) {
    case 'WINDOW':
      return {
        primary: `${toHHMM(start)}–${toHHMM(scheduledEnd)}`,
        label: 'saapumisaika',
      };
    case 'DURATION': {
      const hours = diffWholeHours(start, scheduledEnd);
      return {
        primary: `${toHHMM(start)} → ${toHHMM(scheduledEnd)}`,
        label: `kesto · ${hours} h`,
      };
    }
    case 'FIXED':
    case null:
    case undefined:
      return {
        primary: toHHMM(start),
        label: 'kiinteä aika',
      };
    default: {
      const _exhaustive: never = scheduleType;
      return _exhaustive;
    }
  }
}
