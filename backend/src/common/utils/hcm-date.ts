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

/** Returns UTC boundaries for the current ISO week (Mon–Sun) in Asia/Ho_Chi_Minh time,
 *  plus YYYY-MM-DD display strings for the HCM Monday and Sunday.
 *
 *  weekStart = HCM Monday 00:00+07:00 expressed in UTC (= that Sunday 17:00 UTC)
 *  weekEnd   = HCM Sunday 23:59:59+07:00 expressed in UTC (= that Sunday 16:59:59 UTC)
 */
export function getHcmWeekRange(): {
  weekStart: Date;
  weekEnd: Date;
  weekStartStr: string;
  weekEndStr: string;
} {
  const HCM_OFFSET_MS = 7 * 60 * 60 * 1000;

  // Shift now into HCM time so UTC accessors read HCM local components
  const hcmNow = new Date(Date.now() + HCM_OFFSET_MS);
  const hcmDow = hcmNow.getUTCDay(); // 0=Sun … 6=Sat
  const daysSinceMonday = hcmDow === 0 ? 6 : hcmDow - 1;

  // UTC ms whose UTC date components equal HCM Monday midnight
  const hcmMondayMidnightMs =
    Date.UTC(hcmNow.getUTCFullYear(), hcmNow.getUTCMonth(), hcmNow.getUTCDate()) -
    daysSinceMonday * 86_400_000;

  // Convert HCM midnight to actual UTC (HCM midnight = UTC midnight − 7 h)
  const weekStart = new Date(hcmMondayMidnightMs - HCM_OFFSET_MS);
  // HCM Sunday 23:59:59 = HCM Monday + 7 days − 1 s, then subtract 7 h for UTC
  const weekEnd = new Date(hcmMondayMidnightMs + 7 * 86_400_000 - 1000 - HCM_OFFSET_MS);

  const fmtHcm = (ms: number): string => {
    const d = new Date(ms);
    return [
      d.getUTCFullYear(),
      String(d.getUTCMonth() + 1).padStart(2, '0'),
      String(d.getUTCDate()).padStart(2, '0'),
    ].join('-');
  };

  return {
    weekStart,
    weekEnd,
    weekStartStr: fmtHcm(hcmMondayMidnightMs),
    weekEndStr: fmtHcm(hcmMondayMidnightMs + 6 * 86_400_000),
  };
}
