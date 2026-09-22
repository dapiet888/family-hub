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
    events.push({
      title,
      start: when.iso,
      end: ended?.iso,
      allDay: when.allDay,
      location: fields.get("LOCATION") || undefined,
    });
  }
  return events;
}
