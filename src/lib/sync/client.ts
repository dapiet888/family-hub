import { useEffect, useSyncExternalStore } from "react";
import { useHubStore } from "@/lib/hub-store";
import { pullFamily, pushFamily } from "@/lib/sync/api";
import { diffBoard, withoutDemo, type BoardDoc, type BoardOp } from "@/lib/sync/board";

export function toBoard(): BoardDoc {
  const state = useHubStore.getState();
  return {
    householdName: state.householdName,
    timezone: state.timezone,
    theme: state.theme,
    people: state.people,
    events: state.events,
    lists: state.lists,
    activeListId: state.activeListId,
    itemUses: state.itemUses,
    customItems: state.customItems,
    lastLists: state.lastLists,
    googleFeeds: state.googleFeeds ?? [],
  };
}

let applying = false;

export function runQuiet(work: () => void) {
  applying = true;
  try {
    work();
  } finally {
    applying = false;
  }
}

type SyncStatus = "off" | "live" | "connecting" | "offline" | "local";
let status: SyncStatus = "off";
const listeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
    () => "off" as SyncStatus,
  );
}

export function useFamilySync() {
  const syncCode = useHubStore((s) => s.syncCode);
  const hydrated = useSyncExternalStore(
    (listener) => useHubStore.persist.onFinishHydration(() => listener()),
    () => useHubStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    if (!hydrated || !syncCode) {
      if (!syncCode) setStatus("off");
      return;
    }
    let stop = false;
    if (!localStorage.getItem("family-hub-demo-cleared")) {
      localStorage.setItem("family-hub-demo-cleared", "1");
      useHubStore.setState({
        events: useHubStore.getState().events.filter((event) => !event.id.startsWith("seed-")),
        outbox: [],
      });
    }
    let prev = toBoard();
    const unsub = useHubStore.subscribe(() => {
      if (applying || !useHubStore.getState().syncCode) {
        prev = toBoard();
        return;
      }
      const next = toBoard();
      const ops = diffBoard(prev, next);
      prev = next;
      if (ops.length) useHubStore.getState().queueOps(ops);
    });

    let repaired = false;
    const publish = async (doc: BoardDoc) => {
      const op: BoardOp = { id: crypto.randomUUID(), kind: "snapshot", doc: withoutDemo(doc) };
      const pushed = await pushFamily({ data: { code: syncCode, ops: [op] } });
      if (stop) return;
      runQuiet(() => {
        useHubStore.getState().applyBoard(withoutDemo(pushed.doc ?? doc));
        useHubStore.getState().ackOps(
          useHubStore.getState().outbox.map((item) => item.id),
          pushed.seq,
        );
      });
      prev = toBoard();
    };

    const flush = async () => {
      const state = useHubStore.getState();
      if (!state.syncCode || stop) return;
      setStatus(status === "live" ? "live" : "connecting");
      try {
        if (state.outbox.length) {
          const pushed = await pushFamily({ data: { code: state.syncCode, ops: state.outbox } });
          if (stop) return;
          useHubStore.getState().ackOps(
            pushed.ops.map((op) => op.id),
            pushed.seq,
          );
        }
        const current = useHubStore.getState();
        if (!current.syncCode) return;
        const pulled = await pullFamily({ data: { code: current.syncCode, after: current.syncSeq } });
        if (stop) return;
        const remote = pulled.doc ? withoutDemo(pulled.doc) : null;
        const hadDemo = pulled.doc?.events.some((event) => event.id.startsWith("seed-")) ?? false;
        const local = withoutDemo(toBoard());
        const keepLocal = !remote || hadDemo || (remote.events.length === 0 && local.events.length > 0);
        if (keepLocal && !repaired) {
          repaired = true;
          const ids = new Map(local.events.map((event) => [event.id, event]));
          for (const event of remote?.events ?? []) if (!ids.has(event.id)) ids.set(event.id, event);
          const base = local.events.length >= (remote?.events.length ?? 0) ? local : remote!;
          await publish({ ...base, events: [...ids.values()] });
        } else if (remote && pulled.seq !== current.syncSeq) {
          runQuiet(() => {
            useHubStore.getState().applyBoard(remote);
            useHubStore.getState().setSyncSeq(pulled.seq);
          });
          prev = toBoard();
        }
        const host = location.hostname;
        const shared = pulled.storage === "durable" || host === "localhost" || host === "127.0.0.1";
        setStatus(shared ? "live" : "local");
      } catch {
        if (!stop) setStatus("offline");
      }
    };

    const timer = window.setInterval(() => void flush(), 4000);
    void flush();
    return () => {
      stop = true;
      window.clearInterval(timer);
      unsub();
    };
  }, [hydrated, syncCode]);
}
