import { parseIcs } from "./ics";
import type { GoogleCalendarResult } from "./google-calendar";
import { isGoogleIcalUrl } from "./google-feeds";

export async function loadGoogleFeeds(feeds: { name: string; url: string }[]): Promise<GoogleCalendarResult> {
  const events: {
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay: boolean;
    location: string;
    calendarId: string;
    calendarName: string;
  }[] = [];
  const from = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const to = Date.now() + 90 * 24 * 60 * 60 * 1000;
  const failures: string[] = [];
  for (const feed of feeds) {
    if (!isGoogleIcalUrl(feed.url)) continue;
    try {
      const response = await fetch(feed.url, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: { accept: "text/calendar" },
      });
      if (response.status >= 300 && response.status < 400) {
        failures.push(feed.name);
        continue;
      }
      if (!response.ok) {
        failures.push(feed.name);
        continue;
      }
      const text = (await response.text()).slice(0, 2_000_000);
      for (const event of parseIcs(text)) {
        const when = new Date(event.start).getTime();
        if (when < from || when > to) continue;
        events.push({
          id: `${feed.name}:${event.start}:${event.title}`.slice(0, 180),
          title: event.title,
          start: event.start,
          end: event.end,
          allDay: Boolean(event.allDay),
          location: event.location ?? "",
          calendarId: feed.url,
          calendarName: feed.name,
        });
      }
    } catch {
      failures.push(feed.name);
    }
  }
  if (!events.length && failures.length) {
    return {
      status: "error",
      error: {
        kind: "error",
        message: "Google did not return that calendar. Check the secret iCal address in Settings.",
      },
    };
  }
  return {
    status: "ok",
    calendars: feeds.map((feed) => ({ id: feed.name, summary: feed.name })),
    events,
  };
}
