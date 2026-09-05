// Dates are stored as literal UTC midnight — a calendar-day label (like the
// trading section's PremarketChecklist), not a precise instant. "Today" is
// determined client-side when a quick-add form loads, so it always matches
// the user's own local day rather than the server's.

export function dateInputToUtcMidnight(dateValue: string): Date {
  return new Date(`${dateValue}T00:00:00.000Z`);
}

export function utcMidnightToDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getTodayRange(): { start: Date; end: Date } {
  const start = startOfUtcDay(new Date());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function getThisWeekRange(): { start: Date; end: Date } {
  const todayStart = startOfUtcDay(new Date());
  const dayOfWeek = todayStart.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const start = new Date(todayStart);
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

export function getThisMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}
