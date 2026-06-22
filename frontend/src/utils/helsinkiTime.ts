const HELSINKI_TZ = 'Europe/Helsinki';
const DEFAULT_HHMM = '08:00';

/**
 * Extracts the HH:MM time string from an ISO 8601 string interpreted in
 * Europe/Helsinki timezone. Returns '08:00' if the input is null or invalid.
 */
export function extractHelsinkiHHMM(isoString: string | null | undefined): string {
  if (!isoString) return DEFAULT_HHMM;

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return DEFAULT_HHMM;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: HELSINKI_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '08';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';

  // Intl can return '24' for midnight in some environments; normalise to '00'
  const normalisedHour = hour === '24' ? '00' : hour;

  return `${normalisedHour}:${minute}`;
}

/**
 * Given a target date (YYYY-MM-DD, calendar date in Helsinki timezone) and a
 * time string (HH:MM), returns the equivalent UTC ISO 8601 string.
 *
 * Uses one iteration of offset refinement to handle DST transitions.
 */
export function buildUtcIsoForHelsinki(targetDateISO: string, hhMM: string): string {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!datePattern.test(targetDateISO)) {
    throw new Error(`Invalid targetDateISO format: "${targetDateISO}". Expected YYYY-MM-DD.`);
  }
  if (!timePattern.test(hhMM)) {
    throw new Error(`Invalid hhMM format: "${hhMM}". Expected HH:MM.`);
  }

  const [hourStr, minuteStr] = hhMM.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  function getHelsinkiOffsetMinutes(utcDate: Date): number {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: HELSINKI_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(utcDate);
    const get = (type: string): number =>
      parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

    const localYear = get('year');
    const localMonth = get('month') - 1;
    const localDay = get('day');
    const localHour = get('hour') === 24 ? 0 : get('hour');
    const localMinute = get('minute');

    const localAsUtcMs = Date.UTC(localYear, localMonth, localDay, localHour, localMinute);
    return Math.round((localAsUtcMs - utcDate.getTime()) / 60_000);
  }

  const [year, month, day] = targetDateISO.split('-').map(Number);
  const approxUtcMs = Date.UTC(year, month - 1, day, hour, minute) - 2 * 60 * 60 * 1000;
  const approxDate = new Date(approxUtcMs);

  const offsetMinutes = getHelsinkiOffsetMinutes(approxDate);

  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}
