import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { dropToBoard, parseCheckDrop } from "@/lib/check-drop";
import { parseIcs } from "@/lib/ics";
import { fmtTime } from "@/lib/hub-dates";
import { useHubStore } from "@/lib/hub-store";
import { scanInbox } from "@/lib/scan-mail";
import { redirectToLoginIfRequired } from "@/lib/app-data/login";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Review({
  rows,
  onAdd,
  onAddAll,
}: {
  rows: { key: string; title: string; when?: string; detail?: string }[];
  onAdd: (key: string) => void;
  onAddAll: () => void;
}) {
  if (!rows.length) return <p className="font-sans text-sm text-muted">Nothing to add yet.</p>;
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex max-h-80 flex-col gap-2 overflow-auto">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink">{row.title}</span>
              <span className="block font-sans text-sm text-muted">
                {row.when}
                {row.detail ? ` · ${row.detail}` : ""}
              </span>
            </span>
            <Button type="button" size="sm" onClick={() => onAdd(row.key)}>
              Add
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="secondary" onClick={onAddAll}>
        Add all
      </Button>
    </div>
  );
}

export function IcsForm({ onDone }: { onDone: () => void }) {
  const timezone = useHubStore((s) => s.timezone);
  const applyCheck = useHubStore((s) => s.applyCheck);
  const people = useHubStore((s) => s.people);
  const [rows, setRows] = useState<{ key: string; title: string; start: string; end?: string; location?: string; allDay?: boolean }[]>([]);

  function add(keys: string[]) {
    const picked = rows.filter((row) => keys.includes(row.key));
    if (!picked.length) return;
    applyCheck({
      events: picked.map((row) => ({
        title: row.title,
        start: row.start,
        end: row.end,
        allDay: row.allDay,
        location: row.location,
        personId: people[0]?.id ?? "p1",
        remindMinutes: 30,
      })),
      actions: [],
    });
    toast(picked.length === 1 ? "Event added" : `${picked.length} events added`);
    setRows((current) => current.filter((row) => !keys.includes(row.key)));
    if (keys.length === rows.length) onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Import a calendar</DialogTitle>
        <DialogDescription>Choose an .ics file from Google, Apple, or school. A 30 minute reminder is set on each one.</DialogDescription>
      </DialogHeader>
      <input
        type="file"
        accept=".ics,text/calendar"
        className="font-sans text-sm text-ink"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void file.text().then((text) => {
            const parsed = parseIcs(text).map((item, index) => ({ ...item, key: `${item.start}-${index}` }));
            setRows(parsed);
            if (!parsed.length) toast("That file had no events");
          });
        }}
      />
      <Review
        rows={rows.map((row) => ({
          key: row.key,
          title: row.title,
          when: row.allDay ? "All day" : fmtTime(row.start, timezone),
          detail: row.location,
        }))}
        onAdd={(key) => add([key])}
        onAddAll={() => add(rows.map((row) => row.key))}
      />
    </div>
  );
}

export function MailForm({ onDone }: { onDone: () => void }) {
  const timezone = useHubStore((s) => s.timezone);
  const applyCheck = useHubStore((s) => s.applyCheck);
  const people = useHubStore((s) => s.people);
  const scan = useQuery({ queryKey: ["mail-scan"], queryFn: () => scanInbox() });
  const proposals = scan.data?.status === "ok" ? scan.data.proposals : [];
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = proposals.filter((item) => !hidden.includes(item.start + item.title));

  function add(keys: string[]) {
    const picked = visible.filter((item) => keys.includes(item.start + item.title));
    if (!picked.length) return;
    applyCheck({
      events: picked.map((item) => ({
        title: item.title,
        start: item.start,
        personId: people[0]?.id ?? "p1",
        remindMinutes: 60,
      })),
      actions: [],
    });
    setHidden((current) => [...current, ...keys]);
    toast(picked.length === 1 ? "Added from email" : `${picked.length} added from email`);
    if (keys.length === visible.length) onDone();
  }

  const problem = scan.data && scan.data.status !== "ok" ? scan.data : null;

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Scan email</DialogTitle>
        <DialogDescription>Looks through recent mail for a date and a time. Nothing is added until you tap it.</DialogDescription>
      </DialogHeader>
      {scan.isPending ? <p className="font-sans text-sm text-muted">Reading the inbox…</p> : null}
      {problem?.status === "login" ? (
        <Button type="button" onClick={() => redirectToLoginIfRequired({ ok: false, data: null, loginRequired: true, loginUrl: problem.loginUrl })}>
          Connect Gmail
        </Button>
      ) : null}
      {problem && problem.status !== "login" ? (
        <p className="font-sans text-sm text-muted">
          {problem.status === "pending" ? "Waiting for Gmail…" : problem.status === "not_connected" ? "Gmail is not connected on this screen." : problem.error.message}
        </p>
      ) : null}
      <Review
        rows={visible.map((item) => ({
          key: item.start + item.title,
          title: item.title,
          when: fmtTime(item.start, timezone),
          detail: item.detail,
        }))}
        onAdd={(key) => add([key])}
        onAddAll={() => add(visible.map((item) => item.start + item.title))}
      />
    </div>
  );
}

export function CheckForm({ onDone }: { onDone: () => void }) {
  const people = useHubStore((s) => s.people);
  const lists = useHubStore((s) => s.lists);
  const applyCheck = useHubStore((s) => s.applyCheck);
  const [text, setText] = useState("");

  function onApply() {
    const drop = parseCheckDrop(text);
    if (!drop) {
      toast("That is not a family-hub check");
      return;
    }
    const board = dropToBoard(drop, people, lists);
    if (!board.events.length && !board.actions.length) {
      toast("Nothing solid enough to add");
      return;
    }
    applyCheck(board);
    toast("Check is on the board");
    onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Drop a check</DialogTitle>
        <DialogDescription>
          Paste the family-hub block from your daily check or from Skyler. Events, reminders, and actions land together.
        </DialogDescription>
      </DialogHeader>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        placeholder={'```family-hub\n{"events":[],"actions":[]}\n```'}
        className="w-full rounded-md border border-line bg-panel px-3 py-2 font-sans text-sm text-ink"
      />
      <Button type="button" onClick={onApply}>
        Put it on the board
      </Button>
    </div>
  );
}
