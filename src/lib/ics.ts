import { addDays, differenceInCalendarDays, parseISO, startOfDay, startOfWeek } from "date-fns";

export type ImportedEvent = {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  location?: string;
};

function unfold(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeIcs(value: string) {
  return value.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function parseWhen(raw: string): { iso: string; allDay: boolean } | null {
  const value = raw.trim();
  const day = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (day) {
    const date = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 9, 0, 0);
    return { iso: date.toISOString(), allDay: true };
  }
  const stamp = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!stamp) return null;
  const [, year, month, date, hour, minute, second, zulu] = stamp;
  const made = zulu
    ? new Date(Date.UTC(+year, +month - 1, +date, +hour, +minute, +second))
    : new Date(+year, +month - 1, +date, +hour, +minute, +second);
  if (Number.isNaN(made.getTime())) return null;
  return { iso: made.toISOString(), allDay: false };
}

const WEEKDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function expandRule(event: ImportedEvent, rule: string): ImportedEvent[] {
  const parts = Object.fromEntries(rule.split(";").map((part) => {
    const cut = part.indexOf("=");
    return cut < 0 ? [part, ""] : [part.slice(0, cut).toUpperCase(), part.slice(cut + 1)];
  }));
  const freq = parts.FREQ;
  if (freq !== "DAILY" && freq !== "WEEKLY" && freq !== "MONTHLY") return [event];
  const interval = Math.max(1, Number(parts.INTERVAL || 1) || 1);
  const limit = Math.min(160, Math.max(1, Number(parts.COUNT || 160) || 160));
  const byday = parts.BYDAY
    ?.split(",")
    .map((day) => WEEKDAY[day.trim().slice(-2).toUpperCase()])
    .filter((day) => day !== undefined);
  const start = parseISO(event.start);
  const until = parts.UNTIL ? parseWhen(parts.UNTIL) : null;
  const untilDay = until ? startOfDay(parseISO(until.iso)).getTime() : start.getTime() + 370 * 24 * 60 * 60 * 1000;
  const origin = startOfWeek(start, { weekStartsOn: 1 });
  const duration = event.end ? parseISO(event.end).getTime() - start.getTime() : event.allDay ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
  const copies: ImportedEvent[] = [];
  for (let day = startOfDay(start); day.getTime() <= untilDay && copies.length < limit; day = addDays(day, 1)) {
    const elapsed = differenceInCalendarDays(day, startOfDay(start));
    const weeks = Math.floor(differenceInCalendarDays(day, origin) / 7);
    const months = (day.getFullYear() - start.getFullYear()) * 12 + day.getMonth() - start.getMonth();
    const match =
      freq === "DAILY"
        ? elapsed % interval === 0
        : freq === "WEEKLY"
          ? (byday?.length ? byday : [start.getDay()]).includes(day.getDay()) && weeks % interval === 0
          : day.getDate() === start.getDate() && months % interval === 0;
    if (!match) continue;
    const when = new Date(day);
    when.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
    copies.push({
      ...event,
      start: when.toISOString(),
      end: new Date(when.getTime() + Math.max(duration, 0)).toISOString(),
    });
  }
  return copies.length ? copies : [event];
}

export function parseIcs(text: string): ImportedEvent[] {
  const events: ImportedEvent[] = [];
  for (const block of unfold(text).split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0] ?? "";
    const fields = new Map<string, string>();
    for (const line of body.split("\n")) {
      const split = line.indexOf(":");
      if (split < 1) continue;
      const name = line.slice(0, split).split(";")[0]?.toUpperCase() ?? "";
      fields.set(name, unescapeIcs(line.slice(split + 1)));
    }
    const title = fields.get("SUMMARY");
    const start = fields.get("DTSTART");
    if (!title || !start) continue;
    const when = parseWhen(start);
    if (!when) continue;
    const end = fields.get("DTEND");
    const ended = end ? parseWhen(end) : null;
    const event = {
      title,
      start: when.iso,
      end: ended?.iso,
      allDay: when.allDay,
      location: fields.get("LOCATION") || undefined,
    };
    const rule = fields.get("RRULE");
    events.push(...(rule ? expandRule(event, rule) : [event]));
  }
  return events;
}
