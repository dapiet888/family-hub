import { useEffect, useSyncExternalStore } from "react";
import { useHubStore } from "@/lib/hub-store";
import { pullFamily, pushFamily } from "@/lib/sync/api";
import { diffBoard, type BoardDoc } from "@/lib/sync/board";

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

  useEffect(() => {
    if (!syncCode) {
      setStatus("off");
      return;
    }
    let stop = false;
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
        if (pulled.doc && pulled.seq !== current.syncSeq) {
          runQuiet(() => {
            useHubStore.getState().applyBoard(pulled.doc!);
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
  }, [syncCode]);
}
