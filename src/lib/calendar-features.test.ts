import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEventFields,
  durationLabel,
  endFor,
  mapsUrl,
  occurrenceReminderAt,
  occursOn,
  remindEveryonePatch,
  repeatLabel,
} from "./calendar-features.ts";

const monday = new Date(2026, 8, 21, 9, 0, 0);

test("duration slots are 15, 30, 45, 60 minutes or all day", () => {
  const start = monday.toISOString();
  assert.equal(new Date(endFor(start, 15)).getTime() - monday.getTime(), 15 * 60_000);
  assert.equal(new Date(endFor(start, 30)).getTime() - monday.getTime(), 30 * 60_000);
  assert.equal(new Date(endFor(start, 45)).getTime() - monday.getTime(), 45 * 60_000);
  assert.equal(new Date(endFor(start, 60)).getTime() - monday.getTime(), 60 * 60_000);
  const allDay = buildEventFields({
    title: "Inset day",
    personId: "p1",
    taggedIds: [],
    remindMinutes: null,
    remindEveryone: false,
    start,
    duration: "all",
    repeat: "none",
    repeatDays: [],
  });
  assert.equal(allDay.allDay, true);
  assert.equal(durationLabel("all"), "All day");
  assert.equal(durationLabel(45), "45 min");
});

test("a weekly event lands on the same weekday and not the day before", () => {
  const event = {
    start: monday.toISOString(),
    repeat: "weekly" as const,
  };
  assert.equal(occursOn(event, new Date(2026, 8, 28, 9, 0)), true);
  assert.equal(occursOn(event, new Date(2026, 8, 22, 9, 0)), false);
  assert.equal(occursOn({ start: monday.toISOString(), repeat: "weekdays" }, new Date(2026, 8, 26)), false);
  assert.equal(occursOn({ start: monday.toISOString(), repeat: "days", repeatDays: [1, 3] }, new Date(2026, 8, 23)), true);
  assert.equal(occursOn({ start: monday.toISOString(), repeat: "monthly" }, new Date(2026, 9, 21)), true);
  assert.equal(repeatLabel("days", [1, 3]), "Mon, Wed");
});

test("description is kept on the event", () => {
  const event = buildEventFields({
    title: "Parents evening",
    personId: "p2",
    taggedIds: ["p1"],
    remindMinutes: 30,
    remindEveryone: false,
    start: monday.toISOString(),
    description: "  Bring the reading record. ",
    duration: 60,
    repeat: "none",
    repeatDays: [],
  });
  assert.equal(event.description, "Bring the reading record.");
  assert.equal(event.durationMinutes, 60);
});

test("a location opens as a Google Maps pin", () => {
  const url = mapsUrl("School gate, Bristol");
  assert.equal(url.startsWith("https://www.google.com/maps/search/?api=1&query="), true);
  assert.equal(url.includes("School%20gate"), true);
  const event = buildEventFields({
    title: "Pickup",
    personId: "p1",
    taggedIds: [],
    remindMinutes: null,
    remindEveryone: false,
    start: monday.toISOString(),
    location: "School gate",
    duration: 15,
    repeat: "none",
    repeatDays: [],
  });
  assert.equal(event.location, "School gate");
  assert.equal(mapsUrl(event.location!), url.replace("School%20gate%2C%20Bristol", "School%20gate") || mapsUrl("School gate"));
});

test("remind everyone tags the whole household and keeps a reminder", () => {
  const patch = remindEveryonePatch(["p1", "p2", "p3", "p4"], null);
  assert.deepEqual(patch.taggedIds, ["p1", "p2", "p3", "p4"]);
  assert.equal(patch.remindEveryone, true);
  assert.equal(patch.remindMinutes, 15);
  const event = buildEventFields({
    title: "Bins",
    personId: "p1",
    taggedIds: patch.taggedIds,
    remindMinutes: patch.remindMinutes,
    remindEveryone: patch.remindEveryone,
    start: new Date(2026, 8, 21, 18, 0).toISOString(),
    duration: 15,
    repeat: "weekly",
    repeatDays: [],
  });
  const remindAt = occurrenceReminderAt(event, new Date(2026, 8, 28, 17, 50));
  assert.equal(remindAt != null, true);
});
