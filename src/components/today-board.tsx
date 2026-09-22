import { CalendarClock, MapPin, RefreshCw } from "lucide-react";
import { reminderLabel } from "@/lib/catalogue";
import type { GoogleCalendarResult } from "@/lib/google-calendar";
import { fmtTime, upcomingToday } from "@/lib/hub-dates";
import { type HubEvent, useHubStore } from "@/lib/hub-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListRows } from "@/components/list-rows";

export function TodayBoard({
  now,
  events,
  calendar,
  onLogin,
  onRetry,
  onOpenEvent,
}: {
  now: Date;
  events: HubEvent[];
  calendar: GoogleCalendarResult | undefined;
  onLogin: () => void;
  onRetry: () => void;
  onOpenEvent: (event: HubEvent) => void;
}) {
  const timezone = useHubStore((s) => s.timezone);
  const lists = useHubStore((s) => s.lists);
  const upcoming = upcomingToday(events, now);
  const shopping = lists.find((l) => l.kind === "shopping");
  const chores = lists.find((l) => l.kind === "chores");
  const openShop = shopping?.items.filter((i) => !i.done) ?? [];
  const openChores = chores?.items.filter((i) => !i.done) ?? [];

  return (
    <div className="grid h-full min-h-[28rem] gap-3 lg:grid-cols-[1.35fr_0.9fr]">
      <section className="flex min-h-0 flex-col rounded-xl border border-line bg-panel p-4 shadow-panel sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">Today</h2>
          <p className="font-sans text-sm text-muted">
            {upcoming.length ? `${upcoming.length} on the board` : "Clear day"}
          </p>
        </div>
        <GoogleStrip calendar={calendar} onLogin={onLogin} onRetry={onRetry} />
        <div className="min-h-0 flex-1 overflow-auto">
          {upcoming.length === 0 ? (
            <p className="px-1 py-8 font-sans text-muted">
              Nothing left today. Add the next school run or club.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {upcoming.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  timezone={timezone}
                  onOpen={() => onOpenEvent(event)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="grid min-h-0 gap-3 sm:grid-rows-2">
        <section className="flex min-h-0 flex-col rounded-xl border border-line bg-panel p-4 shadow-panel">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Shopping</h2>
            <p className="font-sans text-sm text-muted">
              {openShop.length} to get
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {shopping ? (
              <ListRows listId={shopping.id} items={openShop.slice(0, 8)} />
            ) : null}
          </div>
        </section>
        <section className="flex min-h-0 flex-col rounded-xl border border-line bg-panel p-4 shadow-panel">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Chores</h2>
            <p className="font-sans text-sm text-muted">
              {openChores.length} open
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {chores ? (
              <ListRows listId={chores.id} items={openChores.slice(0, 8)} />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function EventRow({
  event,
  timezone,
  onOpen,
}: {
  event: HubEvent;
  timezone: string;
  onOpen: () => void;
}) {
  const person = useHubStore(
    (s) => s.people.find((p) => p.id === event.personId) ?? s.people[0],
  );
  const tagged = useHubStore((s) =>
    (event.taggedIds ?? [])
      .map((id) => s.people.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(", "),
  );
  const remind = reminderLabel(event.remindMinutes);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full grid-cols-[5.5rem_0.5rem_1fr] items-start gap-2.5 rounded-md px-1 py-2.5 text-left hover:bg-paper-2"
      >
        <span className="pt-0.5 font-sans text-sm tabular-nums text-muted">
          {event.allDay ? "All day" : fmtTime(event.start, timezone)}
        </span>
        <span
          className="mt-0.5 min-h-9 w-2 self-stretch rounded-full"
          style={{ background: person?.color }}
          aria-hidden
        />
        <span>
          <span className="block font-display text-lg font-semibold leading-snug text-ink">
            {event.title}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-sans text-sm text-muted">
            <span>{person?.name}</span>
            {event.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {event.location}
              </span>
            ) : null}
            {event.source === "google" ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3" />
                Google
              </span>
            ) : null}
            {remind && remind !== "No reminder" ? <span>{remind}</span> : null}
            {tagged ? <span>Tagged {tagged}</span> : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function GoogleStrip({
  calendar,
  onLogin,
  onRetry,
}: {
  calendar: GoogleCalendarResult | undefined;
  onLogin: () => void;
  onRetry: () => void;
}) {
  if (!calendar) {
    return (
      <p className="mb-3 font-sans text-sm text-muted">
        Looking for Google calendars…
      </p>
    );
  }
  if (calendar.status === "ok") {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge>
          Google · {calendar.calendars.length || calendar.events.length}{" "}
          {calendar.calendars.length === 1 ? "calendar" : "sources"}
        </Badge>
        {calendar.events.length === 0 ? (
          <span className="font-sans text-sm text-muted">
            Connected. No events in the next three weeks.
          </span>
        ) : null}
      </div>
    );
  }
  if (calendar.status === "pending") {
    return (
      <p className="mb-3 font-sans text-sm text-muted">
        Connecting to Google Calendar…
      </p>
    );
  }
  if (calendar.status === "login") {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="font-sans text-sm text-muted">{calendar.error.message}</p>
        <Button type="button" size="sm" onClick={onLogin}>
          Continue with Grok
        </Button>
      </div>
    );
  }
  if (calendar.status === "not_connected") {
    return (
      <p className="mb-3 font-sans text-sm text-muted">
        Connect Google Calendar in Grok to pull the family diaries. Local events
        stay on this board either way.
      </p>
    );
  }
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <p className="font-sans text-sm text-muted">{calendar.error.message}</p>
      <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
        <RefreshCw />
        Retry
      </Button>
    </div>
  );
}
