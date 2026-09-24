import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SHOPPING_CATALOGUE } from "./catalogue";
import { isHubTheme, type HubTheme } from "./themes";
import type { GoogleFeed } from "./google-feeds";
import type { RepeatKind } from "./calendar-features";
import type { BoardDoc, BoardOp } from "./sync/board";

export type PersonRole = "adult" | "child";

export type Person = {
  id: string;
  name: string;
  color: string;
  role: PersonRole;
};

export type HubEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  durationMinutes?: number;
  location?: string;
  description?: string;
  repeat?: RepeatKind;
  repeatDays?: number[];
  repeatUntil?: string;
  personId: string;
  taggedIds?: string[];
  remindMinutes?: number | null;
  remindEveryone?: boolean;
  source: "local" | "google";
  calendarId?: string;
  calendarName?: string;
};

export type ListKind = "shopping" | "chores" | "custom";

export type ListItem = {
  id: string;
  text: string;
  done: boolean;
  personId?: string;
  qty?: string;
};

export type HubList = {
  id: string;
  name: string;
  kind: ListKind;
  items: ListItem[];
};

export const PERSON_SWATCHES = [
  "#c45c3e",
  "#2a4a46",
  "#b0894f",
  "#5e8f88",
  "#6b5344",
  "#3d5a80",
  "#7a4e6d",
  "#4a6741",
] as const;

export const DEFAULT_PEOPLE: Person[] = [
  { id: "p1", name: "Parent 1", color: PERSON_SWATCHES[0], role: "adult" },
  { id: "p2", name: "Parent 2", color: PERSON_SWATCHES[1], role: "adult" },
  { id: "p3", name: "Child 1", color: PERSON_SWATCHES[2], role: "child" },
  { id: "p4", name: "Child 2", color: PERSON_SWATCHES[3], role: "child" },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function norm(text: string) {
  return text.trim().toLowerCase();
}

function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = norm(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name.trim());
  }
  return out;
}

function bumpUses(uses: Record<string, number>, name: string) {
  const key = norm(name);
  if (!key) return uses;
  return { ...uses, [key]: (uses[key] ?? 0) + 1 };
}

function rememberCustom(customItems: string[], name: string) {
  const trimmed = name.trim();
  const key = norm(trimmed);
  if (!key) return customItems;
  if (SHOPPING_CATALOGUE.some((item) => norm(item.name) === key)) return customItems;
  if (customItems.some((item) => norm(item) === key)) return customItems;
  return [trimmed, ...customItems];
}

function openNames(items: ListItem[]) {
  return uniqueNames(items.filter((item) => !item.done).map((item) => item.text));
}

function placeShoppingItem(items: ListItem[], text: string, personId?: string) {
  const key = norm(text);
  const open = items.find((item) => !item.done && norm(item.text) === key);
  if (open) return items;
  const done = items.find((item) => item.done && norm(item.text) === key);
  if (done) {
    return items.map((item) => (item.id === done.id ? { ...item, done: false } : item));
  }
  return [{ id: uid("i"), text: text.trim(), done: false, personId }, ...items];
}

function rememberLast(
  lastLists: Record<string, string[]>,
  listId: string,
  before: ListItem[],
  after: ListItem[],
) {
  const prev = openNames(before);
  const next = openNames(after);
  if (prev.length > 0 && next.length === 0) {
    return { ...lastLists, [listId]: prev };
  }
  return lastLists;
}

function seedLists(): HubList[] {
  return [
    {
      id: "shopping",
      name: "Shopping",
      kind: "shopping",
      items: [
        { id: "s1", text: "Milk", done: false },
        { id: "s2", text: "Bread", done: false },
        { id: "s3", text: "Bananas", done: false },
        { id: "s4", text: "Oat milk", done: false },
        { id: "s5", text: "School snacks", done: false },
        { id: "s6", text: "Washing-up liquid", done: false },
      ],
    },
    {
      id: "chores",
      name: "Chores",
      kind: "chores",
      items: [
        { id: "c1", text: "Unload dishwasher", done: false, personId: "p3" },
        { id: "c2", text: "Put bins out", done: false, personId: "p2" },
        { id: "c3", text: "Tidy bedrooms", done: false, personId: "p4" },
        { id: "c4", text: "Pack PE kits", done: false, personId: "p1" },
      ],
    },
  ];
}

type HubState = {
  householdName: string;
  timezone: string;
  theme: HubTheme;
  people: Person[];
  events: HubEvent[];
  lists: HubList[];
  activeListId: string;
  personFilter: string | null;
  itemUses: Record<string, number>;
  customItems: string[];
  lastLists: Record<string, string[]>;
  googleFeeds: GoogleFeed[];
  syncCode: string | null;
  syncSeq: number;
  outbox: BoardOp[];
  addEvent: (input: Omit<HubEvent, "id" | "source">) => void;
  updateEvent: (id: string, patch: Partial<HubEvent>) => void;
  removeEvent: (id: string) => void;
  addList: (name: string) => void;
  setActiveList: (id: string) => void;
  addItem: (listId: string, item: Omit<ListItem, "id" | "done">) => void;
  toggleCatalogueItem: (listId: string, text: string) => void;
  loadLastList: (listId: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
  removeItem: (listId: string, itemId: string) => void;
  clearDone: (listId: string) => void;
  applyCheck: (input: {
    events: Omit<HubEvent, "id" | "source">[];
    actions: { listId: string; text: string; personId?: string }[];
  }) => void;
  updateHousehold: (name: string) => void;
  setTheme: (theme: HubTheme) => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  setPersonFilter: (id: string | null) => void;
  setSync: (code: string | null, seq?: number) => void;
  setSyncSeq: (seq: number) => void;
  queueOps: (ops: BoardOp[]) => void;
  ackOps: (ids: string[], seq: number) => void;
  applyBoard: (doc: BoardDoc) => void;
  addGoogleFeed: (url: string, name: string) => void;
  removeGoogleFeed: (id: string) => void;
};

export const useHubStore = create<HubState>()(
  persist(
    (set) => ({
      householdName: "Our house",
      timezone: "Europe/London",
      theme: "paper",
      people: DEFAULT_PEOPLE,
      events: [],
      lists: seedLists(),
      activeListId: "shopping",
      personFilter: null,
      itemUses: {},
      customItems: [],
      lastLists: {},
      googleFeeds: [],
      syncCode: null,
      syncSeq: 0,
      outbox: [],
      addEvent: (input) =>
        set((s) => ({
          events: [...s.events, { ...input, id: uid("e"), source: "local" }],
        })),
      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      addList: (name) => {
        const id = uid("l");
        set((s) => ({
          lists: [...s.lists, { id, name, kind: "custom", items: [] }],
          activeListId: id,
        }));
      },
      setActiveList: (id) => set({ activeListId: id }),
      addItem: (listId, item) =>
        set((s) => {
          const text = item.text.trim();
          if (!text) return s;
          let added = false;
          const lists = s.lists.map((entry) => {
            if (entry.id !== listId) return entry;
            if (entry.kind === "shopping") {
              const items = placeShoppingItem(entry.items, text, item.personId);
              if (items !== entry.items) added = true;
              return { ...entry, items };
            }
            added = true;
            return {
              ...entry,
              items: [{ ...item, text, id: uid("i"), done: false }, ...entry.items],
            };
          });
          const shopping = s.lists.find((entry) => entry.id === listId)?.kind === "shopping";
          return {
            lists,
            itemUses: shopping && added ? bumpUses(s.itemUses ?? {}, text) : s.itemUses,
            customItems: shopping && added ? rememberCustom(s.customItems ?? [], text) : s.customItems,
          };
        }),
      toggleCatalogueItem: (listId, text) =>
        set((s) => {
          const name = text.trim();
          if (!name) return s;
          let added = false;
          const lists = s.lists.map((list) => {
            if (list.id !== listId) return list;
            const open = list.items.find(
              (item) => !item.done && norm(item.text) === norm(name),
            );
            if (open) {
              const items = list.items.filter((item) => item.id !== open.id);
              return { ...list, items };
            }
            added = true;
            return { ...list, items: placeShoppingItem(list.items, name) };
          });
          const before = s.lists.find((list) => list.id === listId);
          const after = lists.find((list) => list.id === listId);
          return {
            lists,
            itemUses: added ? bumpUses(s.itemUses ?? {}, name) : s.itemUses,
            customItems: added ? rememberCustom(s.customItems ?? [], name) : s.customItems,
            lastLists: before && after ? rememberLast(s.lastLists ?? {}, listId, before.items, after.items) : s.lastLists,
          };
        }),
      loadLastList: (listId) =>
        set((s) => {
          const names = s.lastLists?.[listId] ?? [];
          if (!names.length) return s;
          const list = s.lists.find((entry) => entry.id === listId);
          if (!list) return s;
          let items = list.items;
          let uses = s.itemUses ?? {};
          let custom = s.customItems ?? [];
          for (const name of names) {
            const already = items.some((item) => !item.done && norm(item.text) === norm(name));
            if (already) continue;
            items = placeShoppingItem(items, name);
            uses = bumpUses(uses, name);
            custom = rememberCustom(custom, name);
          }
          return {
            itemUses: uses,
            customItems: custom,
            lists: s.lists.map((entry) => (entry.id === listId ? { ...entry, items } : entry)),
          };
        }),
      toggleItem: (listId, itemId) =>
        set((s) => ({
          lists: s.lists.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: list.items.map((item) =>
                    item.id === itemId ? { ...item, done: !item.done } : item,
                  ),
                }
              : list,
          ),
        })),
      removeItem: (listId, itemId) =>
        set((s) => ({
          lists: s.lists.map((list) =>
            list.id === listId
              ? { ...list, items: list.items.filter((i) => i.id !== itemId) }
              : list,
          ),
          lastLists: (() => {
            const list = s.lists.find((entry) => entry.id === listId);
            if (!list) return s.lastLists;
            const items = list.items.filter((i) => i.id !== itemId);
            return rememberLast(s.lastLists ?? {}, listId, list.items, items);
          })(),
        })),
      clearDone: (listId) =>
        set((s) => {
          const list = s.lists.find((entry) => entry.id === listId);
          const doneNames = uniqueNames((list?.items ?? []).map((item) => item.text));
          const finished = (list?.items ?? []).some((item) => item.done);
          const lastLists =
            finished && doneNames.length > 0
              ? { ...(s.lastLists ?? {}), [listId]: doneNames }
              : s.lastLists;
          return {
            lastLists,
            lists: s.lists.map((entry) =>
              entry.id === listId
                ? { ...entry, items: entry.items.filter((i) => !i.done) }
                : entry,
            ),
          };
        }),
      applyCheck: (input) =>
        set((s) => ({
          events: [
            ...s.events,
            ...input.events.map((event) => ({ ...event, id: uid("e"), source: "local" as const })),
          ],
          lists: s.lists.map((list) => {
            const extra = input.actions.filter((action) => action.listId === list.id);
            if (!extra.length) return list;
            return {
              ...list,
              items: [
                ...extra.map((action) => ({
                  id: uid("i"),
                  text: action.text,
                  done: false,
                  personId: action.personId,
                })),
                ...list.items,
              ],
            };
          }),
        })),
      updateHousehold: (name) => set({ householdName: name }),
      setTheme: (theme) => set({ theme }),
      updatePerson: (id, patch) =>
        set((s) => ({
          people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      setPersonFilter: (id) => set({ personFilter: id }),
      setSync: (code, seq = 0) => set({ syncCode: code, syncSeq: seq, outbox: [] }),
      setSyncSeq: (seq) => set({ syncSeq: seq }),
      queueOps: (ops) => set((s) => ({ outbox: [...s.outbox, ...ops].slice(-80) })),
      ackOps: (ids, seq) =>
        set((s) => ({
          syncSeq: seq,
          outbox: s.outbox.filter((op) => !ids.includes(op.id)),
        })),
      applyBoard: (doc) =>
        set({
          householdName: doc.householdName,
          timezone: doc.timezone,
          theme: isHubTheme(doc.theme) ? doc.theme : "paper",
          people: doc.people,
          events: doc.events,
          lists: doc.lists,
          activeListId: doc.activeListId,
          itemUses: doc.itemUses ?? {},
          customItems: doc.customItems ?? [],
          lastLists: doc.lastLists ?? {},
          googleFeeds: doc.googleFeeds ?? [],
        }),
      addGoogleFeed: (url, name) =>
        set((s) => ({
          googleFeeds: [
            ...(s.googleFeeds ?? []).filter((feed) => feed.url !== url.trim()),
            { id: uid("g"), name: name.trim() || "Google", url: url.trim() },
          ].slice(-8),
        })),
      removeGoogleFeed: (id) =>
        set((s) => ({ googleFeeds: (s.googleFeeds ?? []).filter((feed) => feed.id !== id) })),
    }),
    {
      name: "family-hub-v1",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.events = state.events.filter((event) => !event.id.startsWith("seed-"));
        state.itemUses ??= {};
        state.customItems ??= [];
        state.lastLists ??= {};
        state.googleFeeds ??= [];
        state.outbox ??= [];
        state.syncCode ??= null;
        state.syncSeq ??= 0;
        if (!isHubTheme(state.theme)) state.theme = "paper";
        if (Object.keys(state.itemUses).length === 0) {
          for (const list of state.lists) {
            if (list.kind !== "shopping") continue;
            for (const item of list.items) {
              const key = item.text.trim().toLowerCase();
              if (!key) continue;
              state.itemUses[key] = (state.itemUses[key] ?? 0) + 1;
            }
          }
        }
      },
    },
  ),
);

export function usePerson(id: string | undefined) {
  return useHubStore((s) => s.people.find((p) => p.id === id) ?? s.people[0]);
}
