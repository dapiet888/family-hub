import { DurableObject } from "cloudflare:workers";
import { reduceRoom, type BoardDoc, type BoardOp, type StoredOp } from "./board";

export class HouseholdBoard extends DurableObject {
  private async load(): Promise<{ seq: number; doc: BoardDoc | null; ops: StoredOp[] }> {
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY, seq INTEGER NOT NULL, doc TEXT, ops TEXT NOT NULL)",
    );
    const rows = this.ctx.storage.sql.exec("SELECT seq, doc, ops FROM room WHERE id = 1").toArray();
    const row = rows[0];
    if (!row) return { seq: 0, doc: null, ops: [] };
    return {
      seq: Number(row.seq ?? 0),
      doc: row.doc ? (JSON.parse(String(row.doc)) as BoardDoc) : null,
      ops: JSON.parse(String(row.ops ?? "[]")) as StoredOp[],
    };
  }

  private save(room: { seq: number; doc: BoardDoc | null; ops: StoredOp[] }) {
    this.ctx.storage.sql.exec("DELETE FROM room WHERE id = 1");
    this.ctx.storage.sql.exec(
      "INSERT INTO room (id, seq, doc, ops) VALUES (1, ?, ?, ?)",
      room.seq,
      room.doc ? JSON.stringify(room.doc) : null,
      JSON.stringify(room.ops),
    );
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const room = await this.load();
    if (request.method === "GET") {
      const after = Number(url.searchParams.get("after") ?? "0");
      return Response.json({
        seq: room.seq,
        doc: room.doc,
        ops: room.ops.filter((op) => op.seq > after),
        storage: "durable",
      });
    }
    const body = (await request.json()) as { ops?: BoardOp[] };
    const next = reduceRoom(room, body.ops ?? []);
    this.save(next.room);
    return Response.json({ seq: next.room.seq, doc: next.room.doc, ops: next.accepted, storage: "durable" });
  }
}
