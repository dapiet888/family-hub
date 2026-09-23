import { createServerFn } from "@tanstack/react-start";
import type { GoogleCalendarResult } from "./google-calendar";

export type GoogleFeed = { id: string; name: string; url: string };

export function isGoogleIcalUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "https:" &&
      url.hostname === "calendar.google.com" &&
      url.pathname.startsWith("/calendar/ical/") &&
      url.pathname.endsWith(".ics") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export const fetchGoogleFeeds = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const feeds = typeof data === "object" && data && "feeds" in data && Array.isArray(data.feeds) ? data.feeds : [];
    return {
      feeds: feeds
        .slice(0, 8)
        .map((feed) => {
          const row = feed as { name?: unknown; url?: unknown };
          return { name: String(row.name ?? "Google").slice(0, 80), url: String(row.url ?? "") };
        })
        .filter((feed) => isGoogleIcalUrl(feed.url)),
    };
  })
  .handler(async ({ data }): Promise<GoogleCalendarResult> => {
    const { loadGoogleFeeds } = await import("./google-feeds.server");
    return loadGoogleFeeds(data.feeds);
  });
