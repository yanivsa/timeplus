export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

export function getIsraelDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // outputs YYYY-MM-DD
}

export function getIsraelDayOfWeek(date: Date = new Date()): number {
  // Use Israeli calendar convention: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    weekday: 'short',
  });
  const weekday = formatter.format(date);
  switch (weekday) {
    case 'Sun':
      return 0;
    case 'Mon':
      return 1;
    case 'Tue':
      return 2;
    case 'Wed':
      return 3;
    case 'Thu':
      return 4;
    case 'Fri':
      return 5;
    case 'Sat':
      return 6;
    default:
      return 0;
  }
}

export function getIsraelDateOffset(daysOffset: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getTime() + daysOffset * 86400000);
  return getIsraelDateString(d);
}

export function getIsraelDayDiff(olderDateStr: string, newerDateStr: string): number {
  const [y1, m1, d1] = olderDateStr.split('-').map(Number);
  const [y2, m2, d2] = newerDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function getIsraelStartOfWeek(date: Date = new Date()): string {
  const dayOfWeek = getIsraelDayOfWeek(date); // 0 (Sun) to 6 (Sat)
  return getIsraelDateOffset(-dayOfWeek, date);
}

export function getIsraelStartOfMonth(date: Date = new Date()): string {
  const dateStr = getIsraelDateString(date);
  return dateStr.substring(0, 8) + '01';
}


export function getIsraelTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ISRAEL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
