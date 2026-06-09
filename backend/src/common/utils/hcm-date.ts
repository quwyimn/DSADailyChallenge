// Vietnam is UTC+7 with no DST — safe to hardcode the offset.

/** Returns a Date whose UTC time is midnight of the current Asia/Ho_Chi_Minh calendar date.
 *  Used to query daily_assignments.date (a @db.Date field, stored as a calendar date). */
export function getHcmToday(): Date {
  const hcmMs = Date.now() + 7 * 60 * 60 * 1000;
  const d = new Date(hcmMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${day}T00:00:00.000Z`);
}

/** Returns the UTC [start, end) range that spans exactly one Asia/Ho_Chi_Minh calendar day.
 *  Use for querying Timestamptz fields (e.g., submissions.created_at). */
export function getHcmDayUtcRange(hcmDay: Date): { start: Date; end: Date } {
  // HCM midnight (00:00+07:00) = hcmDay - 7 h in UTC
  const start = new Date(hcmDay.getTime() - 7 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
