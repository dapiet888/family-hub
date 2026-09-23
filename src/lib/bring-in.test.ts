import assert from "node:assert/strict";
import { test } from "node:test";
import { dropToBoard, parseCheckDrop } from "./check-drop.ts";
import { parseIcs } from "./ics.ts";
import { hintFromMail } from "./mail-hints.ts";
import type { HubList, Person } from "./hub-store.ts";

const people: Person[] = [
  { id: "p1", name: "Parent 1", color: "#000", role: "adult" },
  { id: "p3", name: "Skyler", color: "#111", role: "adult" },
];
const lists: HubList[] = [
  { id: "shopping", name: "Shopping", kind: "shopping", items: [] },
  { id: "chores", name: "Chores", kind: "chores", items: [] },
];

test("an ics file becomes events", () => {
  const events = parseIcs(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:School play
DTSTART:20260924T180000
DTEND:20260924T193000
LOCATION:Hall
END:VEVENT
END:VCALENDAR`);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.title, "School play");
  assert.equal(events[0]?.location, "Hall");
});

test("a weekday meeting repeats Monday to Friday", () => {
  const events = parseIcs(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Standup
DTSTART:20260921T090000
DTEND:20260921T093000
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
END:VEVENT
END:VCALENDAR`);
  const days = events.map((event) => new Date(event.start).getDay());
  assert.equal(days.includes(1), true);
  assert.equal(days.includes(5), true);
  assert.equal(days.includes(0), false);
  assert.equal(days.includes(6), false);
  assert.ok(events.length > 5);
});

test("a check block maps people and lists", () => {
  const drop = parseCheckDrop(`Please push this.
\`\`\`family-hub
{"events":[{"title":"Dentist","start":"2026-09-24T09:30:00","person":"Skyler","remindMinutes":60}],"actions":[{"list":"shopping","text":"Milk","person":"Parent 1"}]}
\`\`\``);
  assert.ok(drop);
  const board = dropToBoard(drop!, people, lists);
  assert.equal(board.events[0]?.personId, "p3");
  assert.equal(board.events[0]?.remindMinutes, 60);
  assert.equal(board.actions[0]?.listId, "shopping");
});

test("mail without a date is ignored", () => {
  assert.equal(hintFromMail("Newsletter", "Sale ends at 5pm", new Date("2026-09-23T12:00:00")), null);
  const hint = hintFromMail("Dentist", "Tomorrow at 9:30", new Date("2026-09-23T12:00:00"));
  assert.ok(hint);
  assert.equal(hint?.title, "Dentist");
});
