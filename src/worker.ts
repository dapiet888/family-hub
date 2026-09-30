// Cloudflare Worker entry: the TanStack Start server for the app, the
// household Durable Object, and the scheduled Skyler bridge (see lib/bridge).
import server from "@tanstack/react-start/server-entry";
import { runBridge, type BridgeEnv } from "./lib/bridge/sync";

export { HouseholdBoard } from "./lib/sync/household-board";

type Ctx = { waitUntil(promise: Promise<unknown>): void };

export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    return (server as { fetch(...args: unknown[]): Promise<Response> }).fetch(request, env, ctx);
  },
  scheduled(_controller: unknown, env: BridgeEnv, ctx: Ctx) {
    ctx.waitUntil(
      runBridge(env).catch((error: unknown) => {
        console.error("bridge_failed", error instanceof Error ? error.message : String(error));
      }),
    );
  },
};
