export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

export function getIsraelDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getIsraelDayOfWeek(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    weekday: 'short',
  });
  const weekday = formatter.format(date);
  switch (weekday) {
    case 'Sun': return 0;
    case 'Mon': return 1;
    case 'Tue': return 2;
    case 'Wed': return 3;
    case 'Thu': return 4;
    case 'Fri': return 5;
    case 'Sat': return 6;
    default: return 0;
  }
}

function shiftIsoDate(dateStr: string, daysOffset: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + daysOffset, 12, 0, 0));
  return shifted.toISOString().slice(0, 10);
}

export function getIsraelDateOffset(daysOffset: number, baseDate: Date = new Date()): string {
  return shiftIsoDate(getIsraelDateString(baseDate), daysOffset);
}

export function getIsraelDayDiff(olderDateStr: string, newerDateStr: string): number {
  const [y1, m1, d1] = olderDateStr.split('-').map(Number);
  const [y2, m2, d2] = newerDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function getIsraelStartOfWeek(date: Date = new Date()): string {
  return getIsraelDateOffset(-getIsraelDayOfWeek(date), date);
}

export function getIsraelStartOfMonth(date: Date = new Date()): string {
  return getIsraelDateString(date).substring(0, 8) + '01';
}

const israelDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ISRAEL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function israelLocalMidnightUtcIso(dateStr: string): string {
  const [targetYear, targetMonth, targetDay] = dateStr.split('-').map(Number);
  const targetWallClockAsUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, 0, 0, 0);
  let guess = targetWallClockAsUtc;

  for (let i = 0; i < 4; i++) {
    const parts = israelDateTimeFormatter.formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const observedWallClockAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );
    const correction = targetWallClockAsUtc - observedWallClockAsUtc;
    guess += correction;
    if (Math.abs(correction) < 1000) break;
  }

  return new Date(guess).toISOString();
}

export function getIsraelUtcRange(
  startDateInclusive: string,
  endDateExclusive: string
): { startUtc: string; endUtc: string } {
  return {
    startUtc: israelLocalMidnightUtcIso(startDateInclusive),
    endUtc: israelLocalMidnightUtcIso(endDateExclusive),
  };
}

export function getIsraelTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ISRAEL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
