import assert from "node:assert/strict";
import { test } from "node:test";
import { planDrops, runBridge, snapshotOf, type BridgeDb } from "./sync.ts";
import type { BoardDoc } from "../sync/board.ts";

const board: BoardDoc = {
  householdName: "Our house",
  timezone: "Europe/London",
  theme: "paper",
  people: [
    { id: "p1", name: "Parent 1", color: "#000", role: "adult" },
    { id: "p3", name: "Child 1", color: "#111", role: "child" },
  ],
  events: [{ id: "e1", title: "Dentist", start: "2026-10-02T09:30:00.000Z", personId: "p1", source: "local" }],
  lists: [
    { id: "shopping", name: "Shopping", kind: "shopping", items: [{ id: "s1", text: "Milk", done: false }] },
    { id: "chores", name: "Chores", kind: "chores", items: [] },
  ],
  activeListId: "shopping",
  itemUses: {},
  customItems: [],
  lastLists: {},
  googleFeeds: [{ id: "g1", name: "Work", url: "https://calendar.google.com/calendar/ical/secret/basic.ics" }],
};

test("a drop adds new events and list items, and skips what is already on the board", () => {
  const plan = planDrops(board, [
    {
      id: "d1",
      payload: JSON.stringify({
        events: [
          { title: "School play", start: "2026-10-09T17:30:00Z", end: "2026-10-09T19:00:00Z", person: "Child 1", remindMinutes: 60 },
          { title: "dentist", start: "2026-10-02T09:30:00Z" },
        ],
        actions: [
          { list: "shopping", text: "milk" },
          { list: "shopping", text: "Bananas" },
          { list: "chores", text: "Pack PE kit", person: "Child 1" },
        ],
      }),
    },
  ]);
  assert.equal(plan.results[0]?.status, "applied");
  assert.match(plan.results[0]!.note, /3 added, 2 already there/);
  const puts = plan.ops.filter((op) => op.kind === "event.put");
  assert.equal(puts.length, 1);
  assert.equal(puts[0]!.kind === "event.put" && puts[0]!.event.title, "School play");
  assert.equal(puts[0]!.kind === "event.put" && puts[0]!.event.personId, "p3");
  const lists = plan.ops.find((op) => op.kind === "lists");
  assert.ok(lists && lists.kind === "lists");
  assert.deepEqual(lists.lists.find((l) => l.id === "shopping")!.items.map((i) => i.text), ["Milk", "Bananas"]);
  assert.equal(lists.lists.find((l) => l.id === "chores")!.items[0]!.personId, "p3");
});

test("a drop can only add: no deletes, no edits, no people or feed changes", () => {
  const plan = planDrops(board, [{ id: "d2", payload: JSON.stringify({ people: [], googleFeeds: [], events: [{ title: "New", start: "2026-10-03T10:00:00Z" }] }) }]);
  assert.deepEqual([...new Set(plan.ops.map((op) => op.kind))].sort(), ["event.put"]);
});

test("bad or empty drops fail with a plain note and never break the batch", () => {
  const plan = planDrops(board, [
    { id: "bad", payload: "not json" },
    { id: "empty", payload: JSON.stringify({ events: [{ title: "", start: "nope" }] }) },
    { id: "ok", payload: JSON.stringify({ actions: [{ list: "chores", text: "Bins out" }] }) },
  ]);
  assert.deepEqual(plan.results.map((r) => r.status), ["failed", "failed", "applied"]);
  assert.equal(plan.results[0]!.note, "payload is not JSON");
});

test("the snapshot never carries the secret feed links", () => {
  const snap = snapshotOf(board);
  assert.equal(JSON.stringify(snap).includes("calendar.google.com"), false);
  assert.equal(snap.events.length, 1);
});

// A tiny in-memory stand-in for D1 that understands exactly the statements the bridge runs.
function fakeDb() {
  const state = { drops: [] as { id: string; payload: string; status: string; note?: string }[], snapshot: null as null | { seq: number; doc: string }, log: [] as string[] };
  const db: BridgeDb = {
    prepare(sql: string) {
      const exec = async (values: unknown[]) => {
        if (sql.startsWith("CREATE TABLE")) return { results: [] };
        if (sql.startsWith("INSERT INTO bridge_log")) { state.log.push(String(values[1])); return { results: [] }; }
        if (sql.startsWith("DELETE FROM bridge_log")) return { results: [] };
        if (sql.startsWith("SELECT id, payload FROM drops")) return { results: state.drops.filter((d) => d.status === "pending").map(({ id, payload }) => ({ id, payload })) };
        if (sql.startsWith("UPDATE drops")) { const d = state.drops.find((x) => x.id === values[3]); if (d) { d.status = String(values[0]); d.note = String(values[2]); } return { results: [] }; }
        if (sql.startsWith("DELETE FROM snapshot")) { state.snapshot = null; return { results: [] }; }
        if (sql.startsWith("INSERT INTO snapshot")) { state.snapshot = { seq: Number(values[1]), doc: String(values[2]) }; return { results: [] }; }
        throw new Error("unexpected sql: " + sql);
      };
      const stmt = (values: unknown[]) => ({ run: () => exec(values), all: async <T,>() => (await exec(values)) as { results: T[] } });
      return { ...stmt([]), bind: (...values: unknown[]) => stmt(values) };
    },
  };
  return { db, state };
}

function fakeHousehold(doc: BoardDoc | null) {
  const room = { seq: 3, doc, pushed: [] as unknown[] };
  const stub = {
    async fetch(input: string, init?: RequestInit) {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { ops: unknown[] };
        room.pushed.push(...body.ops);
        room.seq += body.ops.length;
        return Response.json({ seq: room.seq, doc: room.doc, ops: [], storage: "durable" });
      }
      return Response.json({ seq: room.seq, doc: room.doc, ops: [], storage: "durable" });
    },
  };
  return { room, ns: { idFromName: (name: string) => name, get: () => stub } };
}

test("runBridge applies pending drops, marks them, and refreshes the snapshot", async () => {
  const { db, state } = fakeDb();
  state.drops.push({ id: "d1", payload: JSON.stringify({ actions: [{ list: "chores", text: "Bins out" }] }), status: "pending" });
  const home = fakeHousehold(board);
  const result = await runBridge({ BRIDGE: db, HOUSEHOLD: home.ns, FAMILY_CODE: "maple-abcd" });
  assert.equal(result.applied, 1);
  assert.equal(state.drops[0]!.status, "applied");
  assert.equal(home.room.pushed.length, 1);
  assert.ok(state.snapshot && state.snapshot.doc.includes("Our house"));
  assert.equal(state.snapshot.doc.includes("calendar.google.com"), false);
});

test("runBridge waits politely without a family code, and never throws", async () => {
  const { db, state } = fakeDb();
  const result = await runBridge({ BRIDGE: db, HOUSEHOLD: fakeHousehold(board).ns });
  assert.equal(result.note, "no family code");
  assert.match(state.log[0] ?? "", /FAMILY_CODE/);
});

test("runBridge leaves drops pending while the family board is still empty", async () => {
  const { db, state } = fakeDb();
  state.drops.push({ id: "d1", payload: JSON.stringify({ actions: [{ list: "chores", text: "Bins out" }] }), status: "pending" });
  await runBridge({ BRIDGE: db, HOUSEHOLD: fakeHousehold(null).ns, FAMILY_CODE: "maple-abcd" });
  assert.equal(state.drops[0]!.status, "pending");
});
