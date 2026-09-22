import { createServerFn } from "@tanstack/react-start";
import { isFamilyCode, type BoardOp } from "./board";

function codeFrom(data: unknown) {
  const code = typeof data === "object" && data && "code" in data ? String(data.code) : "";
  if (!isFamilyCode(code)) throw new Error("Bad family code");
  return code;
}

export const pullFamily = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const code = codeFrom(data);
    const after = typeof data === "object" && data && "after" in data ? Number(data.after) : 0;
    return { code, after: Number.isFinite(after) ? after : 0 };
  })
  .handler(async ({ data }) => {
    const { pullRoom } = await import("./room.server");
    return pullRoom(data.code, data.after);
  });

export const pushFamily = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const code = codeFrom(data);
    const ops = typeof data === "object" && data && "ops" in data && Array.isArray(data.ops) ? (data.ops as BoardOp[]) : [];
    return { code, ops: ops.slice(0, 50) };
  })
  .handler(async ({ data }) => {
    const { pushRoom } = await import("./room.server");
    return pushRoom(data.code, data.ops);
  });
