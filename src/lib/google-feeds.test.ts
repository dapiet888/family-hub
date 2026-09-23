import assert from "node:assert/strict";
import { test } from "node:test";
import { isGoogleIcalUrl } from "./google-feeds.ts";

test("only a Google secret iCal address is accepted", () => {
  assert.equal(
    isGoogleIcalUrl("https://calendar.google.com/calendar/ical/family%40gmail.com/private-abc/basic.ics"),
    true,
  );
  assert.equal(isGoogleIcalUrl("https://example.com/calendar/ical/basic.ics"), false);
  assert.equal(isGoogleIcalUrl("http://calendar.google.com/calendar/ical/a/basic.ics"), false);
  assert.equal(isGoogleIcalUrl("https://calendar.google.com/calendar/ical/a/basic.ics#@"), true);
});
