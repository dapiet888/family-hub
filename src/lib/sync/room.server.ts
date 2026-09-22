import { isFamilyCode, reduceRoom, type BoardDoc, type BoardOp, type StoredOp } from "./board";

type MemoryRoom = { seq: number; doc: BoardDoc | null; ops: StoredOp[] };

const memory = new Map<string, MemoryRoom>();

export type SyncPage = {
  seq: number;
  doc: BoardDoc | null;
  ops: StoredOp[];
  storage: "durable" | "memory";
};

async function durableStub(code: string) {
  try {
    const specifier = "cloudflare:workers";
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      env?: { HOUSEHOLD?: { idFromName(name: string): unknown; get(id: unknown): { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> } } };
    };
    const ns = mod.env?.HOUSEHOLD;
    if (!ns) return null;
    return ns.get(ns.idFromName(`family-${code}`));
  } catch {
    return null;
  }
}

export async function pullRoom(code: string, after: number): Promise<SyncPage> {
  if (!isFamilyCode(code)) throw new Error("Bad family code");
  const stub = await durableStub(code);
  if (stub) {
    const response = await stub.fetch(`https://board/state?after=${after}`);
    return (await response.json()) as SyncPage;
  }
  const room = memory.get(code) ?? { seq: 0, doc: null, ops: [] };
  return { seq: room.seq, doc: room.doc, ops: room.ops.filter((op) => op.seq > after), storage: "memory" };
}

export async function pushRoom(code: string, ops: BoardOp[]): Promise<SyncPage> {
  if (!isFamilyCode(code)) throw new Error("Bad family code");
  const stub = await durableStub(code);
  if (stub) {
    const response = await stub.fetch("https://board/state", {
      method: "POST",
      body: JSON.stringify({ ops }),
    });
    return (await response.json()) as SyncPage;
  }
  const current = memory.get(code) ?? { seq: 0, doc: null, ops: [] };
  const next = reduceRoom(current, ops);
  memory.set(code, next.room);
  return { seq: next.room.seq, doc: next.room.doc, ops: next.accepted, storage: "memory" };
}
