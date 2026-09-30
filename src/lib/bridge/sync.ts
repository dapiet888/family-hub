// Skyler bridge: lets Pete's private assistant squad (Skyler HQ) read the
// family board and drop events and list items into it, without any public
// API on this Worker.
//
// How it works
// - A D1 database (binding BRIDGE) holds three tables: `drops` (what the
//   squad wants added, in the same shape as "Drop a check"), `snapshot` (a
//   copy of the board the squad can read) and `bridge_log`.
// - The squad writes and reads D1 with Pete's own Cloudflare account. Nothing
//   here is reachable from the internet.
// - Every five minutes (wrangler `triggers.crons`) the Worker's `scheduled`
//   handler applies pending drops to the household Durable Object and
//   refreshes the snapshot. The family code that names the Durable Object is
//   the Worker secret FAMILY_CODE; without it the bridge only logs and waits.
//
// Safety
// - Drops can only add: new events and new open list items. They never delete,
//   never edit an existing event, never change people, feeds, theme or name.
// - An event that already exists with the same title and start is skipped, so
//   a drop applied twice does no harm. Same for an open list item with the
//   same text.
// - Google feed URLs (they are secret links) are stripped from the snapshot.

import { isFamilyCode, type BoardDoc, type BoardOp } from "../sync/board.ts";
import { dropToBoard, type CheckDrop } from "../check-drop.ts";
import type { HubEvent, HubList, ListItem } from "../hub-store.ts";

export const BRIDGE_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS drops (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, source TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', applied_at TEXT, note TEXT)",
  "CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY, updated_at TEXT NOT NULL, seq INTEGER NOT NULL, doc TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS bridge_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, text TEXT NOT NULL)",
];

export type PendingDrop = { id: string; payload: string };
export type DropResult = { id: string; status: "applied" | "failed"; note: string };

function norm(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameMinute(a: string, b: string) {
  const x = new Date(a).getTime();
  const y = new Date(b).getTime();
  return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 60_000;
}

/**
 * Pure planner: given the current board and the pending drops, work out the
 * ops to push and the outcome of every drop. Nothing here touches storage.
 */
export function planDrops(doc: BoardDoc, drops: PendingDrop[]): { ops: BoardOp[]; results: DropResult[] } {
  const ops: BoardOp[] = [];
  const results: DropResult[] = [];
  const events: HubEvent[] = [...doc.events];
  const lists: HubList[] = doc.lists.map((list) => ({ ...list, items: [...list.items] }));
  let listsChanged = false;

  for (const drop of drops) {
    let parsed: CheckDrop | null = null;
    try {
      const value = JSON.parse(drop.payload) as unknown;
      parsed = value && typeof value === "object" ? (value as CheckDrop) : null;
    } catch {
      parsed = null;
    }
    if (!parsed) {
      results.push({ id: drop.id, status: "failed", note: "payload is not JSON" });
      continue;
    }
    const plan = dropToBoard(parsed, doc.people, lists);
    let added = 0;
    let skipped = 0;
    plan.events.forEach((event, index) => {
      const duplicate = events.some((existing) => norm(existing.title) === norm(event.title) && sameMinute(existing.start, event.start));
      if (duplicate) {
        skipped += 1;
        return;
      }
      const full: HubEvent = { ...event, id: `bridge-${drop.id}-e${index}`, source: "local" };
      events.push(full);
      ops.push({ id: `bridge-${drop.id}-e${index}`, kind: "event.put", event: full });
      added += 1;
    });
    plan.actions.forEach((action, index) => {
      const list = lists.find((item) => item.id === action.listId);
      if (!list) {
        skipped += 1;
        return;
      }
      const duplicate = list.items.some((item) => !item.done && norm(item.text) === norm(action.text));
      if (duplicate) {
        skipped += 1;
        return;
      }
      const item: ListItem = { id: `bridge-${drop.id}-a${index}`, text: action.text, done: false, personId: action.personId };
      list.items.push(item);
      listsChanged = true;
      added += 1;
    });
    if (added === 0) {
      results.push({ id: drop.id, status: "failed", note: skipped ? `nothing new: ${skipped} already on the board` : "nothing to apply" });
    } else {
      results.push({ id: drop.id, status: "applied", note: `${added} added${skipped ? `, ${skipped} already there` : ""}` });
    }
  }

  if (listsChanged) {
    ops.push({
      id: `bridge-lists-${drops.map((drop) => drop.id).join("+")}`.slice(0, 200),
      kind: "lists",
      lists,
      activeListId: doc.activeListId,
      itemUses: doc.itemUses,
      customItems: doc.customItems,
      lastLists: doc.lastLists,
    });
  }
  return { ops, results };
}

/** What the squad is allowed to see: the board without the secret feed links. */
export function snapshotOf(doc: BoardDoc) {
  return {
    householdName: doc.householdName,
    timezone: doc.timezone,
    people: doc.people,
    events: doc.events,
    lists: doc.lists,
  };
}

// The little slice of the D1 and Durable Object APIs the bridge uses, so the
// unit test can hand in fakes.
export type BridgeDb = {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<unknown>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }> };
    run(): Promise<unknown>;
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  };
};
export type BoardStub = { fetch(input: string, init?: RequestInit): Promise<Response> };
export type BridgeEnv = {
  BRIDGE?: BridgeDb;
  HOUSEHOLD?: { idFromName(name: string): unknown; get(id: unknown): BoardStub };
  FAMILY_CODE?: string;
};

type RoomState = { seq: number; doc: BoardDoc | null };

export async function runBridge(env: BridgeEnv, now: () => Date = () => new Date()): Promise<{ applied: number; failed: number; note: string }> {
  const db = env.BRIDGE;
  if (!db) return { applied: 0, failed: 0, note: "no BRIDGE database bound" };
  for (const sql of BRIDGE_SCHEMA) await db.prepare(sql).run();
  const log = async (text: string) => {
    await db.prepare("INSERT INTO bridge_log (at, text) VALUES (?, ?)").bind(now().toISOString(), text).run();
    await db.prepare("DELETE FROM bridge_log WHERE id NOT IN (SELECT id FROM bridge_log ORDER BY id DESC LIMIT 200)").run();
  };

  const code = env.FAMILY_CODE ?? "";
  if (!isFamilyCode(code) || !env.HOUSEHOLD) {
    await log("waiting: FAMILY_CODE secret is not set on the Worker, or no household binding");
    return { applied: 0, failed: 0, note: "no family code" };
  }
  const stub = env.HOUSEHOLD.get(env.HOUSEHOLD.idFromName(`family-${code}`));

  const pending = (await db.prepare("SELECT id, payload FROM drops WHERE status = 'pending' ORDER BY created_at LIMIT 20").all<PendingDrop>()).results;
  let applied = 0;
  let failed = 0;
  if (pending.length) {
    const before = (await (await stub.fetch("https://board/state?after=0")).json()) as RoomState;
    if (!before.doc) {
      await log(`waiting: ${pending.length} drop(s) pending but the family board is empty; open Family Hub once on a phone with sync on`);
    } else {
      const plan = planDrops(before.doc, pending);
      if (plan.ops.length) {
        await stub.fetch("https://board/state", { method: "POST", body: JSON.stringify({ ops: plan.ops }) });
      }
      for (const result of plan.results) {
        await db.prepare("UPDATE drops SET status = ?, applied_at = ?, note = ? WHERE id = ?").bind(result.status, now().toISOString(), result.note, result.id).run();
        if (result.status === "applied") applied += 1;
        else failed += 1;
      }
      await log(`applied ${applied} drop(s), ${failed} with nothing to add`);
    }
  }

  const after = (await (await stub.fetch("https://board/state?after=0")).json()) as RoomState;
  if (after.doc) {
    await db.prepare("DELETE FROM snapshot WHERE id = 1").run();
    await db.prepare("INSERT INTO snapshot (id, updated_at, seq, doc) VALUES (1, ?, ?, ?)").bind(now().toISOString(), after.seq, JSON.stringify(snapshotOf(after.doc))).run();
  }
  return { applied, failed, note: pending.length ? "drops processed" : "snapshot refreshed" };
}
