import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOps, diffBoard, isFamilyCode, reduceRoom, withoutDemo, type BoardDoc } from "./board.ts";

const base: BoardDoc = {
  householdName: "Our house",
  timezone: "Europe/London",
  theme: "paper",
  people: [{ id: "p1", name: "Parent 1", color: "#000", role: "adult" }],
  events: [],
  lists: [{ id: "chores", name: "Chores", kind: "chores", items: [] }],
  activeListId: "chores",
  itemUses: {},
  customItems: [],
  lastLists: {},
};

test("a saved event is kept even when the room starts empty", () => {
  const saved = reduceRoom({ seq: 0, doc: null, ops: [] }, [
    { id: "put", kind: "event.put", event: { id: "e1", title: "Dentist", start: "2026-09-24T09:30:00.000Z", personId: "p1", source: "local" } },
  ]);
  assert.equal(saved.room.doc?.events[0]?.title, "Dentist");
});

test("demo events are dropped and cannot be written back", () => {
  const cleaned = withoutDemo({
    ...base,
    events: [
      { id: "seed-school-run", title: "School run", start: "2026-09-24T08:10:00.000Z", personId: "p1", source: "local" },
      { id: "e1", title: "Dentist", start: "2026-09-24T09:30:00.000Z", personId: "p1", source: "local" },
    ],
  });
  assert.equal(cleaned.events.length, 1);
  const room = reduceRoom({ seq: 0, doc: null, ops: [] }, [
    { id: "snap", kind: "snapshot", doc: { ...base, events: [{ id: "seed-pickup", title: "Pickup", start: "2026-09-24T15:40:00.000Z", personId: "p2", source: "local" }] } },
  ]);
  assert.equal(room.room.doc?.events.length, 0);
});

test("a family code is easy to type and not a guess", () => {
  assert.equal(isFamilyCode("maple-k7m2"), true);
  assert.equal(isFamilyCode("nope"), false);
});

test("two screens merge a new event and a ticked chore", () => {
  const withEvent: BoardDoc = {
    ...base,
    events: [{ id: "e1", title: "Dentist", start: "2026-09-24T09:30:00.000Z", personId: "p1", source: "local" }],
  };
  const withChore: BoardDoc = {
    ...base,
    lists: [{ id: "chores", name: "Chores", kind: "chores", items: [{ id: "i1", text: "Bins", done: true }] }],
  };
  const started = reduceRoom({ seq: 0, doc: null, ops: [] }, [{ id: "snap", kind: "snapshot", doc: base }]);
  const phone = reduceRoom(started.room, diffBoard(base, withEvent));
  const tablet = reduceRoom(phone.room, diffBoard(base, withChore));
  assert.equal(tablet.room.doc?.events[0]?.title, "Dentist");
  assert.equal(tablet.room.doc?.lists[0]?.items[0]?.done, true);
  assert.equal(applyOps(base, phone.accepted).events.length, 1);
});
