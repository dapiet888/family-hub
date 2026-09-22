const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export type MailHint = {
  title: string;
  start: string;
  detail: string;
};

function at(day: Date, hour: number, minute: number) {
  const next = new Date(day);
  next.setHours(hour, minute, 0, 0);
  return next;
}

export function hintFromMail(title: string, text: string, now = new Date()): MailHint | null {
  const hay = `${title}\n${text}`;
  const clock = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i.exec(hay);
  const spoken = /\b(\d{1,2})\s*(am|pm)\b/i.exec(hay);
  const time = clock ?? spoken;
  if (!time) return null;
  let hour = Number(time[1]);
  const minute = clock ? Number(clock[2]) : 0;
  const meridiem = (clock ? clock[3] : spoken?.[2])?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  let day = new Date(now);
  const named = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.join("|")})\\b`, "i").exec(hay);
  const numeric = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/.exec(hay);
  const today = /\btoday\b/i.test(hay);
  const tomorrow = /\btomorrow\b/i.test(hay);
  if (!today && !tomorrow && !named && !numeric) return null;
  if (tomorrow) day.setDate(day.getDate() + 1);
  else if (named) {
    const month = MONTHS.indexOf(named[2].toLowerCase());
    const year = now.getFullYear();
    day = new Date(year, month, Number(named[1]));
    if (day.getTime() < now.getTime() - 86400000) day.setFullYear(year + 1);
  } else if (numeric) {
    const year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
    day = new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }

  if (Number.isNaN(day.getTime())) return null;
  const start = at(day, hour, minute);
  if (start.getTime() < now.getTime() - 2 * 86400000) return null;
  return {
    title: title.trim() || "From email",
    start: start.toISOString(),
    detail: text.trim().slice(0, 140),
  };
}
