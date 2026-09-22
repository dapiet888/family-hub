import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { assertHouseholdStaysLocal, findSecrets, scanTree } from "./data-protection.mjs";

test("the app source has no committed secrets", async () => {
  const root = new URL("..", import.meta.url).pathname;
  const hits = [
    ...(await scanTree(`${root}/src`)),
    ...(await scanTree(`${root}/scripts`)),
    ...(await scanTree(`${root}/server`)),
  ];
  assert.deepEqual(hits, []);
});

test("the household board is stored only on the device", async () => {
  const source = await readFile(new URL("../src/lib/hub-store.ts", import.meta.url), "utf8");
  assert.deepEqual(assertHouseholdStaysLocal(source), []);
});

test("a private key or a remote upload would fail", () => {
  assert.equal(findSecrets("-----BEGIN PRIVATE KEY-----\nabc").length, 1);
  assert.deepEqual(findSecrets("theme: paper"), []);
  assert.equal(
    assertHouseholdStaysLocal('fetch("https://example.com"); name: "family-hub-v1"').length > 0,
    true,
  );
});
