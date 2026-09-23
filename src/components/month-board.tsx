import { useState } from "react";
import { addMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { eventsOnDay, fmtTime, isToday, monthGrid, sameMonth } from "@/lib/hub-dates";
import { type HubEvent, useHubStore } from "@/lib/hub-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthBoard({
  now,
  events,
  onOpenEvent,
  onQuickAdd,
}: {
  now: Date;
  events: HubEvent[];
  onOpenEvent: (event: HubEvent) => void;
  onQuickAdd: (day: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => now);
  const [selected, setSelected] = useState(() => now);
  const people = useHubStore((s) => s.people);
  const filter = useHubStore((s) => s.personFilter);
  const setFilter = useHubStore((s) => s.setPersonFilter);
  const timezone = useHubStore((s) => s.timezone);
  const days = monthGrid(cursor);
  const visible = filter
    ? events.filter((event) => event.personId === filter || event.taggedIds?.includes(filter))
    : events;
  const selectedEvents = eventsOnDay(visible, selected);

  return (
    <div className="flex h-full min-h-96 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Previous month"
          onClick={() => setCursor((d) => addMonths(d, -1))}
        >
          <ChevronLeft />
        </Button>
        <h2 className="min-w-40 text-xl font-semibold text-ink">
          {format(cursor, "MMMM yyyy")}
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Next month"
          onClick={() => setCursor((d) => addMonths(d, 1))}
        >
          <ChevronRight />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setCursor(now);
            setSelected(now);
          }}
        >
          This month
        </Button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={cn(
              "h-11 rounded-full border px-3 font-sans text-sm",
              filter === null
                ? "border-forest bg-forest text-cream"
                : "border-line bg-panel text-ink",
            )}
          >
            Everyone
          </button>
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => setFilter(person.id)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full border px-3 font-sans text-sm",
                filter === person.id
                  ? "border-forest bg-forest text-cream"
                  : "border-line bg-panel text-ink",
              )}
            >
              <i
                className="size-2.5 rounded-full"
                style={{ background: person.color }}
                aria-hidden
              />
              {person.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label) => (
          <p
            key={label}
            className="px-1 font-sans text-xs uppercase tracking-wide text-muted"
          >
            {label}
          </p>
        ))}
        {days.map((day) => {
          const items = eventsOnDay(visible, day);
          const inMonth = sameMonth(day, cursor);
          const picked = day.toDateString() === selected.toDateString();
          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelected(day)}
              className={cn(
                "flex min-h-16 flex-col rounded-md border p-1.5 text-left sm:min-h-24",
                inMonth ? "border-line bg-panel" : "border-transparent bg-paper-2/60 text-muted",
                isToday(day) && "ring-2 ring-forest ring-offset-1 ring-offset-paper",
                picked && "bg-paper-2",
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => setSelected(day)}
                  className="font-display text-sm font-semibold tabular-nums"
                  aria-pressed={picked}
                  aria-label={format(day, "EEEE d MMMM")}
                >
                  {format(day, "d")}
                </button>
                {picked ? (
                  <button
                    type="button"
                    aria-label={`Quick add on ${format(day, "d MMMM")}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickAdd(day);
                    }}
                    className="inline-flex size-7 items-center justify-center rounded-full bg-forest text-cream"
                  >
                    <Plus className="size-4" />
                  </button>
                ) : null}
              </span>
              <span className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                {items.slice(0, 3).map((event) => {
                  const person = people.find((p) => p.id === event.personId);
                  return (
                    <span
                      key={event.id}
                      className="truncate rounded-sm px-1 font-sans text-xs text-ink"
                      style={{
                        background: `${person?.color ?? "var(--color-forest)"}22`,
                        borderLeft: `3px solid ${person?.color ?? "var(--color-forest)"}`,
                      }}
                    >
                      {event.allDay ? event.title : `${fmtTime(event.start, timezone)} ${event.title}`}
                    </span>
                  );
                })}
                {items.length > 3 ? (
                  <span className="font-sans text-xs text-muted">
                    +{items.length - 3}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-line bg-panel p-4 shadow-panel">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink">
            {format(selected, "EEEE d MMMM")}
          </h3>
          <Button
            type="button"
            size="icon"
            aria-label={`Quick add on ${format(selected, "d MMMM")}`}
            onClick={() => onQuickAdd(selected)}
          >
            <Plus />
          </Button>
        </div>
        {selectedEvents.length === 0 ? (
          <p className="font-sans text-sm text-muted">Nothing on this day.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {selectedEvents.map((event) => {
              const person = people.find((p) => p.id === event.personId);
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onOpenEvent(event)}
                    className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left hover:bg-paper-2"
                  >
                    <span
                      className="h-8 w-2 rounded-full"
                      style={{ background: person?.color }}
                      aria-hidden
                    />
                    <span>
                      <span className="block font-display text-base font-semibold text-ink">
                        {event.title}
                      </span>
                      <span className="font-sans text-sm text-muted">
                        {event.allDay ? "All day" : fmtTime(event.start, timezone)}
                        {person ? ` · ${person.name}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
