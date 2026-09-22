import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHubStore } from "@/lib/hub-store";
import { pullFamily } from "@/lib/sync/api";
import { isFamilyCode, newFamilyCode } from "@/lib/sync/board";
import { runQuiet, toBoard, useSyncStatus } from "@/lib/sync/client";

export function FamilySyncPanel() {
  const syncCode = useHubStore((s) => s.syncCode);
  const setSync = useHubStore((s) => s.setSync);
  const queueOps = useHubStore((s) => s.queueOps);
  const [join, setJoin] = useState("");
  const status = useSyncStatus();

  function start() {
    const code = newFamilyCode();
    setSync(code, 0);
    queueOps([{ id: crypto.randomUUID(), kind: "snapshot", doc: toBoard() }]);
    toast("Family sync is on. Put this code on the other screens.");
  }

  async function joinFamily() {
    const code = join.trim().toLowerCase();
    if (!isFamilyCode(code)) {
      toast("That code does not look right");
      return;
    }
    setSync(code, 0);
    try {
      const pulled = await pullFamily({ data: { code, after: 0 } });
      if (pulled.doc) {
        runQuiet(() => {
          useHubStore.getState().applyBoard(pulled.doc!);
          useHubStore.getState().setSyncSeq(pulled.seq);
        });
        toast("Joined the family board");
      } else {
        queueOps([{ id: crypto.randomUUID(), kind: "snapshot", doc: toBoard() }]);
        toast("This code is new. The board will start from this screen.");
      }
    } catch {
      toast("Could not reach the family board");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-3">
      <p className="font-medium text-ink">Family sync</p>
      {syncCode ? (
        <>
          <p className="font-sans text-2xl tracking-wide text-ink">{syncCode}</p>
          <p className="font-sans text-sm text-muted">
            {status === "offline"
              ? "Offline. Changes stay on this screen until it reconnects."
              : status === "local"
                ? "This screen has the code, but the live site is not sharing yet."
                : "Live. Other screens with this code stay on the same board."}
          </p>
          <Button type="button" variant="ghost" onClick={() => setSync(null, 0)}>
            Stop on this screen
          </Button>
        </>
      ) : (
        <>
          <p className="font-sans text-sm text-muted">
            One code for the kitchen screen and the phones. Lists, events, and names stay together.
          </p>
          <Button type="button" onClick={start}>
            Turn on family sync
          </Button>
          <Input
            value={join}
            placeholder="maple-k7m2"
            onChange={(event) => setJoin(event.target.value)}
            aria-label="Family code"
          />
          <Button type="button" variant="secondary" onClick={() => void joinFamily()}>
            Join with a code
          </Button>
        </>
      )}
    </div>
  );
}
