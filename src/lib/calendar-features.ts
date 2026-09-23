import { addDays, parseISO, startOfDay } from "date-fns";
import type { HubEvent } from "./hub-store";

export const DURATION_CHOICES = [15, 30, 45, 60] as const;
export type DurationChoice = (typeof DURATION_CHOICES)[number] | "all";
export type RepeatKind = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "days";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function durationChoice(event?: Pick<HubEvent, "allDay" | "durationMinutes" | "start" | "end"> | null): DurationChoice {
  if (!event) return 30;
  if (event.allDay) return "all";
  if (event.durationMinutes && DURATION_CHOICES.includes(event.durationMinutes as (typeof DURATION_CHOICES)[number])) {
    return event.durationMinutes as DurationChoice;
  }
  if (event.end) {
    const mins = Math.round((parseISO(event.end).getTime() - parseISO(event.start).getTime()) / 60_000);
    if (DURATION_CHOICES.includes(mins as (typeof DURATION_CHOICES)[number])) return mins as DurationChoice;
  }
  return 30;
}

export function endFor(startIso: string, duration: DurationChoice) {
  const start = parseISO(startIso);
  if (duration === "all") return addDays(startOfDay(start), 1).toISOString();
  return new Date(start.getTime() + duration * 60_000).toISOString();
}

export function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
}

export function remindEveryonePatch(peopleIds: string[], remindMinutes: number | null | undefined) {
  return {
    taggedIds: [...peopleIds],
    remindEveryone: true,
    remindMinutes: remindMinutes ?? 15,
  };
}

export function repeatLabel(repeat: RepeatKind | undefined, days: number[] | undefined) {
  if (!repeat || repeat === "none") return null;
  if (repeat === "daily") return "Every day";
  if (repeat === "weekdays") return "Weekdays";
  if (repeat === "weekly") return "Every week";
  if (repeat === "monthly") return "Every month";
  const names = (days ?? []).slice().sort((a, b) => a - b).map((day) => DAY_NAMES[day - 1]).filter(Boolean);
  return names.length ? names.join(", ") : "Chosen days";
}

export function durationLabel(duration: DurationChoice) {
  return duration === "all" ? "All day" : `${duration} min`;
}

function isoWeekday(day: Date) {
  const sunday = day.getDay();
  return sunday === 0 ? 7 : sunday;
}

export function occursOn(
  event: Pick<HubEvent, "start" | "end" | "allDay" | "repeat" | "repeatDays" | "repeatUntil">,
  day: Date,
) {
  const start = parseISO(event.start);
  if (Number.isNaN(start.getTime())) return false;
  const dayStart = startOfDay(day).getTime();
  const first = startOfDay(start).getTime();
  if (event.repeatUntil) {
    const until = startOfDay(parseISO(event.repeatUntil)).getTime();
    if (!Number.isNaN(until) && dayStart > until) return false;
  }
  const repeat = event.repeat ?? "none";
  if (repeat === "none") {
    if (event.allDay) return first === dayStart;
    const from = dayStart;
    const to = addDays(startOfDay(day), 1).getTime();
    const end = event.end ? parseISO(event.end).getTime() : start.getTime() + 30 * 60_000;
    return start.getTime() < to && end > from;
  }
  if (dayStart < first) return false;
  if (repeat === "daily") return true;
  if (repeat === "weekdays") {
    const weekday = day.getDay();
    return weekday >= 1 && weekday <= 5;
  }
  if (repeat === "weekly") return day.getDay() === start.getDay();
  if (repeat === "monthly") return day.getDate() === start.getDate();
  if (repeat === "days") return (event.repeatDays ?? []).includes(isoWeekday(day));
  return false;
}

export function occurrenceReminderAt(
  event: Pick<HubEvent, "start" | "end" | "allDay" | "repeat" | "repeatDays" | "repeatUntil" | "remindMinutes">,
  now: Date,
) {
  if (event.remindMinutes == null || event.allDay) return null;
  for (let offset = -1; offset <= 1; offset += 1) {
    const day = addDays(startOfDay(now), offset);
    if (!occursOn(event, day)) continue;
    const start = parseISO(event.start);
    const when = new Date(day);
    when.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
    const remindAt = when.getTime() - event.remindMinutes * 60_000;
    if (now.getTime() >= remindAt && now.getTime() <= when.getTime() + 10 * 60_000) return remindAt;
  }
  return null;
}

export function buildEventFields(input: {
  title: string;
  personId: string;
  taggedIds: string[];
  remindMinutes: number | null;
  remindEveryone: boolean;
  start: string;
  location?: string;
  description?: string;
  duration: DurationChoice;
  repeat: RepeatKind;
  repeatDays: number[];
  repeatUntil?: string;
}): Omit<HubEvent, "id" | "source"> {
  const allDay = input.duration === "all";
  return {
    title: input.title.trim(),
    personId: input.personId,
    taggedIds: input.taggedIds,
    remindMinutes: input.remindMinutes,
    remindEveryone: input.remindEveryone && input.taggedIds.length > 0,
    start: input.start,
    end: endFor(input.start, input.duration),
    allDay,
    durationMinutes: input.duration === "all" ? undefined : input.duration,
    location: input.location?.trim() || undefined,
    description: input.description?.trim() || undefined,
    repeat: input.repeat,
    repeatDays: input.repeat === "days" ? input.repeatDays : undefined,
    repeatUntil: input.repeat === "none" ? undefined : input.repeatUntil || undefined,
  };
}
