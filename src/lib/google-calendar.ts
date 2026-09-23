import { createServerFn } from "@tanstack/react-start";
import { addDays, startOfDay } from "date-fns";
import {
  classifyCallToolError,
  type CallToolErrorState,
} from "@/lib/app-data/errors";
import {
  ConnectorType,
  GoogleCalendarTools,
  type CallToolResult,
} from "@/lib/app-data";

const PUBLIC_GOOGLE_MESSAGE =
  "Connect Google in Settings. Paste the secret iCal address from Google Calendar and the diaries show on this screen.";

export function isPublicFamilyHost(host: string | null | undefined) {
  const name = (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
  if (!name || name === "localhost" || name === "127.0.0.1" || name === "[::1]") return false;
  if (name === "grok.me" || name.endsWith(".grok.me")) return false;
  if (name.endsWith(".grok-sandbox.com") || name.includes("app-builder")) return false;
  return true;
}

export type GoogleCal = {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
};

export type GoogleCalEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  location: string;
  calendarId: string;
  calendarName: string;
};

export type GoogleCalendarResult =
  | {
      status: "ok";
      calendars: GoogleCal[];
      events: GoogleCalEvent[];
    }
  | {
      status: "pending" | "login" | "not_connected" | "error";
      error: CallToolErrorState;
      loginUrl?: string;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function pickArray(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const rec = asRecord(value);
  if (!rec) return [];
  for (const key of keys) {
    const hit = rec[key];
    if (Array.isArray(hit)) return hit;
  }
  if (rec.data) return pickArray(rec.data, keys);
  return [];
}

function nested(value: unknown, path: string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    const rec = asRecord(current);
    if (!rec) return undefined;
    current = rec[key];
  }
  return current;
}

function parseCalendars(data: unknown): GoogleCal[] {
  return pickArray(data, ["calendars", "items", "calendarList"]).flatMap(
    (item) => {
      const rec = asRecord(item);
      if (!rec) return [];
      const id = asString(rec.id ?? rec.calendarId ?? rec.calendar_id);
      if (!id) return [];
      return [
        {
          id,
          summary: asString(rec.summary ?? rec.name ?? rec.title) || id,
          primary: rec.primary === true,
          backgroundColor: asString(
            rec.backgroundColor ?? rec.background_color ?? rec.color,
          ),
        },
      ];
    },
  );
}

function parseStart(rec: Record<string, unknown>): {
  start: string;
  end?: string;
  allDay: boolean;
} | null {
  const startObj = asRecord(rec.start);
  const endObj = asRecord(rec.end);
  const start =
    asString(startObj?.dateTime) ||
    asString(startObj?.date) ||
    asString(rec.start) ||
    asString(rec.start_time) ||
    asString(rec.startTime);
  if (!start) return null;
  const end =
    asString(endObj?.dateTime) ||
    asString(endObj?.date) ||
    asString(rec.end) ||
    asString(rec.end_time) ||
    asString(rec.endTime) ||
    undefined;
  const allDay = Boolean(
    startObj?.date && !startObj?.dateTime
      ? true
      : rec.allDay === true || rec.all_day === true || /^\d{4}-\d{2}-\d{2}$/.test(start),
  );
  return { start, end, allDay };
}

function parseEvents(data: unknown, calendars: GoogleCal[]): GoogleCalEvent[] {
  const byId = new Map(calendars.map((c) => [c.id, c.summary]));
  return pickArray(data, ["events", "items", "results"]).flatMap((item) => {
    const rec = asRecord(item);
    if (!rec) return [];
    const times = parseStart(rec);
    if (!times) return [];
    const calendarId = asString(
      rec.calendarId ?? rec.calendar_id ?? nested(rec, ["organizer", "email"]) ?? "primary",
    );
    const id = asString(rec.id ?? rec.iCalUID ?? rec.ical_uid);
    return [
      {
        id: id || `${calendarId}-${times.start}-${asString(rec.summary)}`,
        title: asString(rec.summary ?? rec.title ?? rec.name) || "(No title)",
        start: times.start,
        end: times.end,
        allDay: times.allDay,
        location: asString(rec.location),
        calendarId,
        calendarName:
          asString(rec.calendarName ?? rec.calendar_name) ||
          byId.get(calendarId) ||
          calendarId,
      },
    ];
  });
}

function failFrom(
  result: CallToolResult,
): Extract<GoogleCalendarResult, { status: string }> {
  const error =
    classifyCallToolError(result) ??
    ({ kind: "error", message: result.errorMessage ?? "Calendar unavailable." } satisfies CallToolErrorState);
  const status =
    error.kind === "pending"
      ? "pending"
      : error.kind === "login"
        ? "login"
        : error.kind === "not_connected"
          ? "not_connected"
          : "error";
  return {
    status,
    error,
    loginUrl: result.loginUrl,
  };
}

export const fetchGoogleCalendar = createServerFn({ method: "POST" }).handler(
  async (): Promise<GoogleCalendarResult> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    let host: string | null = null;
    try {
      const request = getRequest();
      host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    } catch {
      host = null;
    }
    if (isPublicFamilyHost(host)) {
      return {
        status: "not_connected",
        error: { kind: "not_connected", message: PUBLIC_GOOGLE_MESSAGE },
      };
    }
    const { callTool } = await import("@/lib/app-data/client.server");
    const options = { connectorType: ConnectorType.GoogleCalendar };
    const now = new Date();
    const timeMin = startOfDay(addDays(now, -1)).toISOString();
    const timeMax = addDays(now, 42).toISOString();

    const list = await callTool(
      GoogleCalendarTools.listCalendars,
      {},
      options,
    );
    if (!list.ok) return failFrom(list);
    const calendars = parseCalendars(list.data);

    const search = await callTool(
      GoogleCalendarTools.search,
      {
        query: "",
        time_min: timeMin,
        time_max: timeMax,
        max_results: 80,
      },
      options,
    );
    if (!search.ok) {
      const retry = await callTool(
        GoogleCalendarTools.search,
        {
          query: "*",
          timeMin,
          timeMax,
          maxResults: 80,
        },
        options,
      );
      if (!retry.ok) return failFrom(retry);
      return {
        status: "ok",
        calendars,
        events: parseEvents(retry.data, calendars),
      };
    }

    return {
      status: "ok",
      calendars,
      events: parseEvents(search.data, calendars),
    };
  },
);
