import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOps, diffBoard, isFamilyCode, reduceRoom, type BoardDoc } from "./board.ts";

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
