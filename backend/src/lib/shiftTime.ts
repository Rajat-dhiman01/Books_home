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