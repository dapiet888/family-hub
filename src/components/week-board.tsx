import { format } from "date-fns";
import { eventsOnDay, fmtTime, isToday, weekDays } from "@/lib/hub-dates";
import { type HubEvent, useHubStore } from "@/lib/hub-store";
import { cn } from "@/lib/utils";

export function WeekBoard({
  now,
  events,
  onOpenEvent,
}: {
  now: Date;
  events: HubEvent[];
  onOpenEvent: (event: HubEvent) => void;
}) {
  const people = useHubStore((s) => s.people);
  const filter = useHubStore((s) => s.personFilter);
  const setFilter = useHubStore((s) => s.setPersonFilter);
  const timezone = useHubStore((s) => s.timezone);
  const days = weekDays(now);
  const visible = filter
    ? events.filter((event) => event.personId === filter)
    : events;

  return (
    <div className="flex h-full min-h-[28rem] flex-col gap-3">
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
      <div className="grid min-h-0 flex-1 gap-2 max-md:auto-rows-min md:grid-cols-7">
        {days.map((day) => {
          const items = eventsOnDay(visible, day);
          const today = isToday(day);
          return (
            <section
              key={day.toISOString()}
              className={cn(
                "flex min-h-40 flex-col rounded-lg border border-line bg-panel p-2.5 shadow-panel",
                today && "ring-2 ring-forest ring-offset-2 ring-offset-paper",
              )}
            >
              <header className="mb-2 font-sans">
                <p className="text-xs uppercase tracking-wide text-muted">
                  {format(day, "EEE")}
                </p>
                <p className="font-display text-lg font-semibold text-ink">
                  {format(day, "d")}
                </p>
              </header>
              <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
                {items.length === 0 ? (
                  <p className="px-0.5 font-sans text-sm text-muted">—</p>
                ) : (
                  items.map((event) => {
                    const person = people.find((p) => p.id === event.personId);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onOpenEvent(event)}
                        className="rounded-md border border-transparent p-2 text-left font-sans text-sm leading-snug text-ink"
                        style={{
                          background: `${person?.color ?? "var(--color-forest)"}22`,
                          borderLeft: `4px solid ${person?.color ?? "var(--color-forest)"}`,
                        }}
                      >
                        <strong className="font-semibold">
                          {event.allDay
                            ? event.title
                            : `${fmtTime(event.start, timezone)} ${event.title}`}
                        </strong>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
