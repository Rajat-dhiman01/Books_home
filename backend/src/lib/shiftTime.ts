export function getNowInTimezone(timezone: string) {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);
  return { date, time };
}

export function isTimeInShift(
  time: string,
  shift: { startTime: string; endTime: string; crossesMidnight: boolean }
) {
  const t = time.length === 5 ? `${time}:00` : time;
  if (!shift.crossesMidnight) {
    return t >= shift.startTime && t < shift.endTime;
  }
  return t >= shift.startTime || t < shift.endTime;
}

// Adds (or subtracts, with a negative value) calendar days to a YYYY-MM-DD
// date string. Pure calendar-date arithmetic — no timezone conversion here,
// since the date string is already the correct local calendar date.
export function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// Returns the first calendar day of the month containing dateStr, as a
// YYYY-MM-DD string. Pure calendar-date arithmetic, same convention as
// shiftDate above — the input date string is already the correct local
// calendar date, so no timezone conversion happens here.
export function startOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}