import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { HubEvent, Person } from "./hub-store";
import { occursOn } from "./calendar-features";

export function fmtTime(iso: string, timeZone: string) {
  const date = parseISO(iso);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function fmtDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
}

export function fmtClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function eventStart(event: HubEvent) {
  return parseISO(event.start);
}

export function eventEnd(event: HubEvent) {
  if (event.end) return parseISO(event.end);
  const start = eventStart(event);
  return new Date(start.getTime() + 30 * 60 * 1000);
}

export function eventsOnDay(events: HubEvent[], day: Date) {
  return events
    .filter((event) => occursOn(event, day))
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return eventStart(a).getTime() - eventStart(b).getTime();
    });
}

export function weekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function monthGrid(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function sameMonth(day: Date, month: Date) {
  return isSameMonth(day, month);
}

export function isToday(day: Date) {
  return isSameDay(day, new Date());
}

export function upcomingToday(events: HubEvent[], now = new Date()) {
  return eventsOnDay(events, now).filter((event) => {
    if (event.allDay) return true;
    return eventEnd(event).getTime() >= now.getTime();
  });
}

export function guessPersonId(
  title: string,
  calendarName: string,
  people: Person[],
) {
  const blob = `${title} ${calendarName}`.toLowerCase();
  const hit = people.find((p) => p.name && blob.includes(p.name.toLowerCase()));
  if (hit) return hit.id;
  return people.find((p) => p.role === "adult")?.id ?? people[0]?.id ?? "p1";
}

export function toDatetimeLocal(iso: string) {
  const d = parseISO(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(value: string) {
  return new Date(value).toISOString();
}
