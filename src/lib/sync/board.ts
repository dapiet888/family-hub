import type { HubEvent, HubList, ListItem, Person } from "../hub-store";
import type { HubTheme } from "../themes";
import type { GoogleFeed } from "../google-feeds";

export type BoardDoc = {
  householdName: string;
  timezone: string;
  theme: HubTheme;
  people: Person[];
  events: HubEvent[];
  lists: HubList[];
  activeListId: string;
  itemUses: Record<string, number>;
  customItems: string[];
  lastLists: Record<string, string[]>;
  googleFeeds?: GoogleFeed[];
};

export type BoardOp =
  | { id: string; kind: "snapshot"; doc: BoardDoc }
  | { id: string; kind: "meta"; householdName?: string; timezone?: string; theme?: HubTheme }
  | { id: string; kind: "people"; people: Person[] }
  | { id: string; kind: "event.put"; event: HubEvent }
  | { id: string; kind: "event.del"; eventId: string }
  | { id: string; kind: "lists"; lists: HubList[]; activeListId: string; itemUses: Record<string, number>; customItems: string[]; lastLists: Record<string, string[]> }
  | { id: string; kind: "feeds"; googleFeeds: GoogleFeed[] };

export type StoredOp = BoardOp & { seq: number };

export function withoutDemo(doc: BoardDoc): BoardDoc {
  return { ...doc, events: doc.events.filter((event) => !event.id.startsWith("seed-")) };
}

function blankBoard(): BoardDoc {
  return {
    householdName: "Our house",
    timezone: "Europe/London",
    theme: "paper",
    people: [],
    events: [],
    lists: [],
    activeListId: "shopping",
    itemUses: {},
    customItems: [],
    lastLists: {},
    googleFeeds: [],
  };
}
export function reduceRoom(
  room: { seq: number; doc: BoardDoc | null; ops: StoredOp[] },
  incoming: BoardOp[],
) {
  const accepted: StoredOp[] = [];
  let seq = room.seq;
  let doc = room.doc;
  for (const op of incoming) {
    if (room.ops.some((item) => item.id === op.id) || accepted.some((item) => item.id === op.id)) continue;
    seq += 1;
    const stored = { ...op, seq };
    accepted.push(stored);
    doc = applyOps(doc ?? blankBoard(), [op]);
  }
  return { room: { seq, doc, ops: [...room.ops, ...accepted].slice(-400) }, accepted };
}

const WORDS = ["maple", "river", "kite", "plum", "cedar", "amber", "brook", "flint", "lark", "meadow", "otter", "pebble", "ridge", "willow", "yarrow"];
const TAIL = "abcdefghijkmnpqrstuvwxyz23456789";

export function newFamilyCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const word = WORDS[bytes[0]! % WORDS.length];
  const tail = [...bytes.slice(1)].map((value) => TAIL[value % TAIL.length]).join("");
  return `${word}-${tail}`;
}

export function isFamilyCode(code: string) {
  return /^[a-z]+-[a-z2-9]{4,12}$/.test(code);
}

function sameItem(a: ListItem, b: ListItem) {
  return a.text === b.text && a.done === b.done && a.personId === b.personId && a.qty === b.qty;
}

function sameList(a: HubList, b: HubList) {
  return a.name === b.name && a.kind === b.kind && a.items.length === b.items.length && a.items.every((item, index) => sameItem(item, b.items[index]!));
}

export function diffBoard(prev: BoardDoc, next: BoardDoc): BoardOp[] {
  const ops: BoardOp[] = [];
  const meta: Extract<BoardOp, { kind: "meta" }> = { id: crypto.randomUUID(), kind: "meta" };
  let metaChanged = false;
  if (prev.householdName !== next.householdName) {
    meta.householdName = next.householdName;
    metaChanged = true;
  }
  if (prev.timezone !== next.timezone) {
    meta.timezone = next.timezone;
    metaChanged = true;
  }
  if (prev.theme !== next.theme) {
    meta.theme = next.theme;
    metaChanged = true;
  }
  if (metaChanged) ops.push(meta);
  if (JSON.stringify(prev.people) !== JSON.stringify(next.people)) {
    ops.push({ id: crypto.randomUUID(), kind: "people", people: next.people });
  }
  const prevEvents = new Map(prev.events.map((event) => [event.id, event]));
  for (const event of next.events) {
    const before = prevEvents.get(event.id);
    if (!before || JSON.stringify(before) !== JSON.stringify(event)) {
      ops.push({ id: crypto.randomUUID(), kind: "event.put", event });
    }
  }
  for (const event of prev.events) {
    if (!next.events.some((item) => item.id === event.id)) {
      ops.push({ id: crypto.randomUUID(), kind: "event.del", eventId: event.id });
    }
  }
  const listsChanged =
    prev.activeListId !== next.activeListId ||
    JSON.stringify(prev.itemUses) !== JSON.stringify(next.itemUses) ||
    JSON.stringify(prev.customItems) !== JSON.stringify(next.customItems) ||
    JSON.stringify(prev.lastLists) !== JSON.stringify(next.lastLists) ||
    prev.lists.length !== next.lists.length ||
    prev.lists.some((list, index) => !sameList(list, next.lists[index]!));
  if (listsChanged) {
    ops.push({
      id: crypto.randomUUID(),
      kind: "lists",
      lists: next.lists,
      activeListId: next.activeListId,
      itemUses: next.itemUses,
      customItems: next.customItems,
      lastLists: next.lastLists,
    });
  }
  if (JSON.stringify(prev.googleFeeds ?? []) !== JSON.stringify(next.googleFeeds ?? [])) {
    ops.push({ id: crypto.randomUUID(), kind: "feeds", googleFeeds: next.googleFeeds ?? [] });
  }
  return ops;
}

export function applyOps(doc: BoardDoc, ops: BoardOp[]): BoardDoc {
  let next = doc;
  for (const op of ops) {
    if (op.kind === "snapshot") next = withoutDemo(op.doc);
    else if (op.kind === "meta") {
      next = {
        ...next,
        householdName: op.householdName ?? next.householdName,
        timezone: op.timezone ?? next.timezone,
        theme: op.theme ?? next.theme,
      };
    } else if (op.kind === "people") next = { ...next, people: op.people };
    else if (op.kind === "event.put") {
      if (op.event.id.startsWith("seed-")) continue;
      const exists = next.events.some((event) => event.id === op.event.id);
      next = {
        ...next,
        events: exists ? next.events.map((event) => (event.id === op.event.id ? op.event : event)) : [...next.events, op.event],
      };
    } else if (op.kind === "event.del") {
      next = { ...next, events: next.events.filter((event) => event.id !== op.eventId) };
    } else if (op.kind === "lists") {
      next = {
        ...next,
        lists: op.lists,
        activeListId: op.activeListId,
        itemUses: op.itemUses,
        customItems: op.customItems,
        lastLists: op.lastLists,
      };
    } else if (op.kind === "feeds") {
      next = { ...next, googleFeeds: op.googleFeeds };
    }
  }
  return next;
}
