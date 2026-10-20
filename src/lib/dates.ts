const weekdayMap: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export type ZonedDate = {
  date: string;
  weekday: number;
};

export function getZonedDate(
  instant: Date,
  timeZone: string,
): ZonedDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(instant);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = weekdayMap[values.weekday];

  if (!values.year || !values.month || !values.day || !weekday) {
    throw new Error(`无法计算时区 ${timeZone} 的本地日期`);
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    weekday,
  };
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000);
}

export function addDays(date: string, amount: number): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + amount);
  return instant.toISOString().slice(0, 10);
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    throw new Error("无效的日期或时间");
  }

  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(targetAsUtc);

  for (let index = 0; index < 2; index += 1) {
    const parts = zonedParts(candidate, timeZone);
    const shownAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    candidate = new Date(candidate.getTime() + (targetAsUtc - shownAsUtc));
  }

  return candidate;
}
