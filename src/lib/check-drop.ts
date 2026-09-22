import type { HubEvent, HubList, Person } from "./hub-store";

export type CheckDrop = {
  events?: {
    title?: string;
    start?: string;
    end?: string;
    location?: string;
    person?: string;
    tag?: string;
    remindMinutes?: number | null;
  }[];
  actions?: {
    list?: string;
    text?: string;
    person?: string;
  }[];
};

function personId(people: Person[], name: string | undefined) {
  if (!name?.trim()) return people[0]?.id;
  const key = name.trim().toLowerCase();
  return (
    people.find((person) => {
      const label = person.name.toLowerCase();
      return label === key || label.includes(key) || key.includes(label);
    })?.id ?? people[0]?.id
  );
}

function listId(lists: HubList[], name: string | undefined) {
  const key = (name ?? "chores").toLowerCase();
  const match = lists.find(
    (list) => list.kind === key || list.name.toLowerCase().includes(key) || list.id === key,
  );
  return match?.id ?? lists.find((list) => list.kind === "chores")?.id ?? lists[0]?.id;
}

export function parseCheckDrop(text: string): CheckDrop | null {
  const fenced = text.match(/```family-hub\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1)) as CheckDrop;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function dropToBoard(drop: CheckDrop, people: Person[], lists: HubList[]) {
  const events: Omit<HubEvent, "id" | "source">[] = [];
  for (const event of drop.events ?? []) {
    const title = event.title?.trim();
    const start = event.start ? new Date(event.start) : null;
    if (!title || !start || Number.isNaN(start.getTime())) continue;
    const who = personId(people, event.person);
    const tagged = event.tag ? personId(people, event.tag) : undefined;
    events.push({
      title,
      start: start.toISOString(),
      end: event.end && !Number.isNaN(new Date(event.end).getTime()) ? new Date(event.end).toISOString() : undefined,
      location: event.location?.trim() || undefined,
      personId: who ?? "p1",
      taggedIds: tagged && tagged !== who ? [tagged] : undefined,
      remindMinutes: typeof event.remindMinutes === "number" ? event.remindMinutes : null,
      allDay: false,
    });
  }
  const actions: { listId: string; text: string; personId?: string }[] = [];
  for (const action of drop.actions ?? []) {
    const text = action.text?.trim();
    const id = listId(lists, action.list);
    if (!text || !id) continue;
    actions.push({ listId: id, text, personId: personId(people, action.person) });
  }
  return { events, actions };
}
