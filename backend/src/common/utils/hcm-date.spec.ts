import { getHcmToday, getHcmDayUtcRange, getHcmWeekRange } from './hcm-date';

function mockNow(utcIso: string) {
  jest.spyOn(Date, 'now').mockReturnValue(new Date(utcIso).getTime());
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getHcmToday — day boundary at 23:59 / 00:01 HCM', () => {
  it('23:59 HCM (16:59 UTC) is still "today" for that calendar day', () => {
    mockNow('2026-06-10T16:59:00.000Z'); // 2026-06-10 23:59 HCM
    expect(getHcmToday().toISOString()).toBe('2026-06-10T00:00:00.000Z');
  });

  it('00:01 HCM (17:01 UTC the previous day) rolls over to the new calendar day', () => {
    mockNow('2026-06-10T17:01:00.000Z'); // 2026-06-11 00:01 HCM
    expect(getHcmToday().toISOString()).toBe('2026-06-11T00:00:00.000Z');
  });
});

describe('getHcmDayUtcRange — duplicate-submission window', () => {
  it('23:58 and 23:59 HCM submissions on the same day land in the same range', () => {
    mockNow('2026-06-10T16:58:00.000Z'); // 23:58 HCM
    const range1 = getHcmDayUtcRange(getHcmToday());

    mockNow('2026-06-10T16:59:00.000Z'); // 23:59 HCM, same calendar day
    const range2 = getHcmDayUtcRange(getHcmToday());

    expect(range1).toEqual(range2);

    const submittedAt1 = new Date('2026-06-10T16:58:30.000Z');
    const submittedAt2 = new Date('2026-06-10T16:59:30.000Z');
    expect(submittedAt1 >= range1.start && submittedAt1 < range1.end).toBe(true);
    expect(submittedAt2 >= range2.start && submittedAt2 < range2.end).toBe(true);
  });

  it('a submission on day N and the same task on day N+1 land in different (non-overlapping) ranges', () => {
    mockNow('2026-06-10T16:59:00.000Z'); // day N, 23:59 HCM
    const rangeN = getHcmDayUtcRange(getHcmToday());

    mockNow('2026-06-10T17:01:00.000Z'); // day N+1, 00:01 HCM
    const rangeN1 = getHcmDayUtcRange(getHcmToday());

    expect(rangeN).not.toEqual(rangeN1);

    const submittedDayN = new Date('2026-06-10T16:59:30.000Z');
    const submittedDayN1 = new Date('2026-06-10T17:01:30.000Z');

    expect(submittedDayN >= rangeN.start && submittedDayN < rangeN.end).toBe(true);
    expect(submittedDayN >= rangeN1.start && submittedDayN < rangeN1.end).toBe(false);

    expect(submittedDayN1 >= rangeN1.start && submittedDayN1 < rangeN1.end).toBe(true);
    expect(submittedDayN1 >= rangeN.start && submittedDayN1 < rangeN.end).toBe(false);
  });
});

describe('getHcmWeekRange — leaderboard week rollover', () => {
  it('a submission on Sunday 23:59 HCM falls within the current (just-ending) week', () => {
    // 2026-06-14 is a Sunday. Sunday 23:59 HCM = Sunday 16:59 UTC.
    mockNow('2026-06-14T16:59:00.000Z');
    const { weekStart, weekEnd, weekStartStr, weekEndStr } = getHcmWeekRange();

    const submittedAt = new Date('2026-06-14T16:59:30.000Z');
    expect(submittedAt >= weekStart && submittedAt <= weekEnd).toBe(true);
    expect(weekStartStr).toBe('2026-06-08'); // Monday of that week
    expect(weekEndStr).toBe('2026-06-14'); // Sunday of that week
  });

  it('a submission on Monday 00:01 HCM falls within the NEW week, not the previous one', () => {
    // Monday 00:01 HCM = Sunday 17:01 UTC (previous calendar day in UTC).
    mockNow('2026-06-14T17:01:00.000Z'); // -> HCM Monday 2026-06-15 00:01
    const newWeek = getHcmWeekRange();

    const submittedAt = new Date('2026-06-14T17:01:30.000Z');
    expect(submittedAt >= newWeek.weekStart && submittedAt <= newWeek.weekEnd).toBe(true);
    expect(newWeek.weekStartStr).toBe('2026-06-15');
    expect(newWeek.weekEndStr).toBe('2026-06-21');

    // Must NOT also fall within the previous week's range
    mockNow('2026-06-14T16:59:00.000Z'); // back to Sunday 23:59 HCM to compute the previous week
    const prevWeek = getHcmWeekRange();
    expect(submittedAt >= prevWeek.weekStart && submittedAt <= prevWeek.weekEnd).toBe(false);
  });

  it('a submission in the last second of Sunday HCM (23:59:59.5) is still counted in that week', () => {
    mockNow('2026-06-14T16:59:59.999Z'); // HCM Sunday 23:59:59.999
    const { weekStart, weekEnd } = getHcmWeekRange();

    const submittedAt = new Date('2026-06-14T16:59:59.500Z'); // HCM Sunday 23:59:59.5
    expect(submittedAt >= weekStart && submittedAt <= weekEnd).toBe(true);
  });
});
