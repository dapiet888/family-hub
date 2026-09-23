import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarRange,
  House,
  ListTodo,
  Plus,
  Settings,
} from "lucide-react";
import { useRefetchWhenConnectorReady } from "@/lib/app-data";
import { redirectToLoginIfRequired } from "@/lib/app-data/login";
import { fetchGoogleCalendar, isPublicFamilyHost } from "@/lib/google-calendar";
import { fmtClock, fmtDay, guessPersonId } from "@/lib/hub-dates";
import { reminderLabel } from "@/lib/catalogue";
import { occurrenceReminderAt } from "@/lib/calendar-features";
import { type HubEvent, useHubStore } from "@/lib/hub-store";
import { Button } from "@/components/ui/button";
import { useFamilySync } from "@/lib/sync/client";
import { AddDialogs } from "@/components/hub-dialogs";
import { ListsBoard } from "@/components/lists-board";
import { MonthBoard } from "@/components/month-board";
import { TodayBoard } from "@/components/today-board";
import { WeekBoard } from "@/components/week-board";
import { cn } from "@/lib/utils";

export type HubView = "today" | "week" | "month" | "lists";

function useClock(timeZone: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return { now, clock: fmtClock(now, timeZone), day: fmtDay(now, timeZone) };
}

export function HubApp({ view }: { view: HubView }) {
  return <HubReady view={view} />;
}

function HubReady({ view }: { view: HubView }) {
  const householdName = useHubStore((s) => s.householdName);
  const timezone = useHubStore((s) => s.timezone);
  const people = useHubStore((s) => s.people);
  const localEvents = useHubStore((s) => s.events);
  const { now, clock, day } = useClock(timezone);
  const [addOpen, setAddOpen] = useState<
    "choose" | "event" | "item" | "ics" | "mail" | "check" | null
  >(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HubEvent | null>(null);
  const [draftStart, setDraftStart] = useState<string | null>(null);
  useFamilySync();

  function quickAdd(day: Date) {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    setDraftStart(start.toISOString());
    setAddOpen("event");
  }

  const [googleOnThisScreen, setGoogleOnThisScreen] = useState(false);
  useEffect(() => {
    setGoogleOnThisScreen(!isPublicFamilyHost(window.location.hostname));
  }, []);
  const calendarQuery = useQuery({
    queryKey: ["google-calendar"],
    queryFn: () => fetchGoogleCalendar(),
    enabled: googleOnThisScreen,
    staleTime: 60_000,
  });

  const publicCalendar = useMemo(
    () => ({
      status: "not_connected" as const,
      error: {
        kind: "not_connected" as const,
        message:
          "Google Calendar connects inside Grok, not on the family link. Add the event here, or import a calendar file. It still syncs to the other screens.",
      },
    }),
    [],
  );
  const calendar = googleOnThisScreen ? calendarQuery.data : publicCalendar;
  useRefetchWhenConnectorReady(
    googleOnThisScreen &&
      (calendar?.status === "pending" || calendarQuery.isFetching),
    calendarQuery.refetch,
  );

  const googleEvents: HubEvent[] = useMemo(() => {
    if (calendar?.status !== "ok") return [];
    return calendar.events.map((event) => ({
      id: `g-${event.id}`,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      location: event.location,
      personId: guessPersonId(event.title, event.calendarName, people),
      source: "google" as const,
      calendarId: event.calendarId,
      calendarName: event.calendarName,
    }));
  }, [calendar, people]);

  const events = useMemo(() => {
    const seen = new Set<string>();
    const merged: HubEvent[] = [];
    for (const event of [...googleEvents, ...localEvents]) {
      const key = `${event.title}|${event.start}|${event.source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(event);
    }
    return merged;
  }, [googleEvents, localEvents]);

  useReminders(events);

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Family Hub
          </p>
          <p className="truncate font-sans text-sm text-muted" suppressHydrationWarning>
            {householdName} · {day}
          </p>
        </div>
        <p className="hidden font-display text-3xl tabular-nums tracking-tight text-ink sm:block" suppressHydrationWarning>
          {clock}
        </p>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
          {people.map((person) => (
            <span
              key={person.id}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-panel py-1.5 pl-1.5 pr-3 font-sans text-sm text-ink"
            >
              <i
                className="size-3.5 rounded-full"
                style={{ background: person.color }}
                aria-hidden
              />
              <span className="hidden sm:inline">{person.name}</span>
            </span>
          ))}
        </div>
        <Button type="button" onClick={() => setAddOpen("choose")}>
          <Plus />
          Add
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings />
        </Button>
      </header>

      <main className="min-h-0 flex-1">
        {view === "today" && (
          <TodayBoard
            now={now}
            events={events}
            calendar={calendar}
            onLogin={() => {
              if (calendar && "loginUrl" in calendar) {
                redirectToLoginIfRequired({
                  ok: false,
                  data: null,
                  loginRequired: true,
                  loginUrl: calendar.loginUrl,
                });
              }
            }}
            onRetry={() => void calendarQuery.refetch()}
            onOpenEvent={setEditingEvent}
          />
        )}
        {view === "week" && (
          <WeekBoard
            now={now}
            events={events}
            onOpenEvent={setEditingEvent}
            onQuickAdd={quickAdd}
          />
        )}
        {view === "month" && (
          <MonthBoard
            now={now}
            events={events}
            onOpenEvent={setEditingEvent}
            onQuickAdd={quickAdd}
          />
        )}
        {view === "lists" && <ListsBoard />}
      </main>

      <nav className="sticky bottom-0 z-20 flex justify-center gap-2 overflow-x-auto pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
        <DockLink to="/" active={view === "today"} icon={House} label="Today" />
        <DockLink
          to="/week"
          active={view === "week"}
          icon={CalendarDays}
          label="Week"
        />
        <DockLink
          to="/month"
          active={view === "month"}
          icon={CalendarRange}
          label="Month"
        />
        <DockLink
          to="/lists"
          active={view === "lists"}
          icon={ListTodo}
          label="Lists"
        />
      </nav>

      <AddDialogs
        addOpen={addOpen}
        setAddOpen={(value) => {
          if (value !== "event") setDraftStart(null);
          setAddOpen(value);
        }}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
        draftStart={draftStart}
      />
    </div>
  );
}

function DockLink({
  to,
  active,
  icon: Icon,
  label,
}: {
  to: "/" | "/week" | "/month" | "/lists";
  active: boolean;
  icon: typeof House;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-12 min-w-20 items-center justify-center gap-2 rounded-lg border px-3 font-sans text-sm font-medium transition-colors duration-150",
        active
          ? "border-forest bg-forest text-cream"
          : "border-line bg-panel text-ink hover:bg-paper-2",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

const FIRED_KEY = "family-hub-reminders";

function useReminders(events: HubEvent[]) {
  const people = useHubStore((s) => s.people);
  useEffect(() => {
    function tick() {
      const now = Date.now();
      let fired: string[] = [];
      try {
        fired = JSON.parse(localStorage.getItem(FIRED_KEY) || "[]") as string[];
      } catch {
        fired = [];
      }
      const seen = new Set(fired);
      let changed = false;
      for (const event of events) {
        const remindAt = occurrenceReminderAt(event, new Date(now));
        if (remindAt == null) continue;
        const key = `${event.id}:${remindAt}`;
        if (seen.has(key)) continue;
        seen.add(key);
        changed = true;
        const names = (event.taggedIds ?? [])
          .map((id) => people.find((person) => person.id === id)?.name)
          .filter(Boolean);
        const who = names.length ? ` · ${names.join(", ")}` : "";
        const when = reminderLabel(event.remindMinutes) ?? "Reminder";
        toast(`${when}: ${event.title}${who}`);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(event.title, {
            body: `${when}${who}${event.location ? ` · ${event.location}` : ""}`,
          });
        }
      }
      if (changed) {
        localStorage.setItem(FIRED_KEY, JSON.stringify([...seen].slice(-200)));
      }
    }
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, [events, people]);
}
