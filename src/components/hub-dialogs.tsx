import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { addHours, setMinutes, startOfHour } from "date-fns";
import { toast } from "sonner";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/hub-dates";
import { REMINDER_OPTIONS } from "@/lib/catalogue";
import {
  PERSON_SWATCHES,
  type HubEvent,
  useHubStore,
} from "@/lib/hub-store";
import { HUB_THEMES } from "@/lib/themes";
import { CheckForm, IcsForm, MailForm } from "@/components/bring-in";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddDialogs({
  addOpen,
  setAddOpen,
  settingsOpen,
  setSettingsOpen,
  editingEvent,
  setEditingEvent,
}: {
  addOpen: "choose" | "event" | "item" | "ics" | "mail" | "check" | null;
  setAddOpen: (value: "choose" | "event" | "item" | "ics" | "mail" | "check" | null) => void;
  settingsOpen: boolean;
  setSettingsOpen: (value: boolean) => void;
  editingEvent: HubEvent | null;
  setEditingEvent: (value: HubEvent | null) => void;
}) {
  return (
    <>
      <Dialog
        open={addOpen !== null}
        onOpenChange={(open) => {
          if (!open) setAddOpen(null);
        }}
      >
        <DialogContent>
          {addOpen === "choose" ? (
            <ChooseForm
              onEvent={() => setAddOpen("event")}
              onItem={() => setAddOpen("item")}
              onIcs={() => setAddOpen("ics")}
              onMail={() => setAddOpen("mail")}
              onCheck={() => setAddOpen("check")}
            />
          ) : null}
          {addOpen === "event" ? (
            <EventForm
              onDone={() => setAddOpen(null)}
              onCancel={() => setAddOpen(null)}
            />
          ) : null}
          {addOpen === "item" ? (
            <ItemForm
              onDone={() => setAddOpen(null)}
              onCancel={() => setAddOpen(null)}
            />
          ) : null}
          {addOpen === "ics" ? <IcsForm onDone={() => setAddOpen(null)} /> : null}
          {addOpen === "mail" ? <MailForm onDone={() => setAddOpen(null)} /> : null}
          {addOpen === "check" ? <CheckForm onDone={() => setAddOpen(null)} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <SettingsForm onDone={() => setSettingsOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingEvent !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEvent(null);
        }}
      >
        <DialogContent>
          {editingEvent ? (
            <EventForm
              event={editingEvent}
              onDone={() => setEditingEvent(null)}
              onCancel={() => setEditingEvent(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChooseForm({
  onEvent,
  onItem,
  onIcs,
  onMail,
  onCheck,
}: {
  onEvent: () => void;
  onItem: () => void;
  onIcs: () => void;
  onMail: () => void;
  onCheck: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add</DialogTitle>
        <DialogDescription>
          Put something on the family board.
        </DialogDescription>
      </DialogHeader>
      <Button type="button" onClick={onEvent}>
        Calendar event
      </Button>
      <Button type="button" variant="secondary" onClick={onItem}>
        List item
      </Button>
      <Button type="button" variant="secondary" onClick={onIcs}>
        Import calendar
      </Button>
      <Button type="button" variant="secondary" onClick={onMail}>
        Scan email
      </Button>
      <Button type="button" variant="secondary" onClick={onCheck}>
        Drop a check
      </Button>
    </>
  );
}

function EventForm({
  event,
  onDone,
  onCancel,
}: {
  event?: HubEvent;
  onDone: () => void;
  onCancel: () => void;
}) {
  const people = useHubStore((s) => s.people);
  const addEvent = useHubStore((s) => s.addEvent);
  const updateEvent = useHubStore((s) => s.updateEvent);
  const removeEvent = useHubStore((s) => s.removeEvent);
  const readOnly = event?.source === "google";
  const defaultStart = toDatetimeLocal(
    event?.start ?? addHours(setMinutes(startOfHour(new Date()), 0), 1).toISOString(),
  );
  const [remindMinutes, setRemindMinutes] = useState<number | null>(
    event?.remindMinutes ?? null,
  );
  const [taggedIds, setTaggedIds] = useState<string[]>(event?.taggedIds ?? []);

  function toggleTag(id: string) {
    setTaggedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function onSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (readOnly) {
      onDone();
      return;
    }
    const data = new FormData(formEvent.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const payload = {
      title,
      personId: String(data.get("personId") ?? people[0]?.id ?? "p1"),
      taggedIds,
      remindMinutes,
      start: fromDatetimeLocal(String(data.get("start") ?? "")),
      location: String(data.get("location") ?? "").trim() || undefined,
      allDay: false,
    };
    if (remindMinutes != null && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    if (event) {
      updateEvent(event.id, payload);
      toast("Event updated");
    } else {
      addEvent(payload);
      toast("Event added to the board");
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>
          {readOnly ? "Google event" : event ? "Edit event" : "Add to the family calendar"}
        </DialogTitle>
        <DialogDescription>
          {readOnly
            ? "This one lives in Google Calendar. Change it there and it will refresh here."
            : "Saved on this screen. After Google is connected, family diaries still appear alongside it."}
        </DialogDescription>
      </DialogHeader>
      <Field label="Title">
        <Input
          name="title"
          required
          defaultValue={event?.title ?? ""}
          placeholder="School pickup"
          disabled={readOnly}
        />
      </Field>
      <Field label="Who">
        <select
          name="personId"
          defaultValue={event?.personId ?? people[0]?.id}
          disabled={readOnly}
          className="h-12 w-full rounded-md border border-line bg-panel px-3 font-sans text-base text-ink disabled:opacity-70"
        >
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Starts">
        <Input
          name="start"
          type="datetime-local"
          required
          defaultValue={defaultStart}
          disabled={readOnly}
        />
      </Field>
      <Field label="Where">
        <Input
          name="location"
          defaultValue={event?.location ?? ""}
          placeholder="School gate"
          disabled={readOnly}
        />
      </Field>
      <Field label="Remind before">
        <div className="flex flex-wrap gap-2">
          {REMINDER_OPTIONS.map((option) => {
            const selected = remindMinutes === option.minutes;
            return (
              <button
                key={option.label}
                type="button"
                disabled={readOnly}
                onClick={() => setRemindMinutes(option.minutes)}
                className={`h-11 rounded-full border px-3 font-sans text-sm ${
                  selected
                    ? "border-forest bg-forest text-cream"
                    : "border-line bg-panel text-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Tag someone">
        <div className="flex flex-wrap gap-2">
          {people.map((person) => {
            const selected = taggedIds.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                disabled={readOnly}
                onClick={() => toggleTag(person.id)}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-3 font-sans text-sm ${
                  selected
                    ? "border-forest bg-forest text-cream"
                    : "border-line bg-panel text-ink"
                }`}
              >
                <i
                  className="size-2.5 rounded-full"
                  style={{ background: person.color }}
                  aria-hidden
                />
                {person.name}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="mt-1 flex flex-wrap justify-end gap-2">
        {event && !readOnly ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              removeEvent(event.id);
              toast("Event removed");
              onDone();
            }}
          >
            Delete
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={onCancel}>
          Close
        </Button>
        {!readOnly ? (
          <Button type="submit">{event ? "Save" : "Save event"}</Button>
        ) : null}
      </div>
    </form>
  );
}

function ItemForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const lists = useHubStore((s) => s.lists);
  const people = useHubStore((s) => s.people);
  const addItem = useHubStore((s) => s.addItem);
  const setActiveList = useHubStore((s) => s.setActiveList);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const listId = String(data.get("listId") ?? lists[0]?.id ?? "");
    const text = String(data.get("text") ?? "").trim();
    if (!listId || !text) return;
    addItem(listId, {
      text,
      personId: String(data.get("personId") ?? "") || undefined,
    });
    setActiveList(listId);
    toast("Added to the list");
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Add to a list</DialogTitle>
        <DialogDescription>Shopping, chores, or any list you keep.</DialogDescription>
      </DialogHeader>
      <Field label="List">
        <select
          name="listId"
          className="h-12 w-full rounded-md border border-line bg-panel px-3 font-sans text-base text-ink"
          defaultValue={lists[0]?.id}
        >
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Item">
        <Input name="text" required placeholder="Eggs / tidy bedroom" />
      </Field>
      <Field label="Who">
        <select
          name="personId"
          className="h-12 w-full rounded-md border border-line bg-panel px-3 font-sans text-base text-ink"
          defaultValue=""
        >
          <option value="">Anyone</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add</Button>
      </div>
    </form>
  );
}

function SettingsForm({ onDone }: { onDone: () => void }) {
  const householdName = useHubStore((s) => s.householdName);
  const people = useHubStore((s) => s.people);
  const updateHousehold = useHubStore((s) => s.updateHousehold);
  const updatePerson = useHubStore((s) => s.updatePerson);
  const theme = useHubStore((s) => s.theme);
  const setTheme = useHubStore((s) => s.setTheme);
  const [name, setName] = useState(householdName);

  useEffect(() => {
    setName(householdName);
  }, [householdName]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateHousehold(name.trim() || householdName);
    const data = new FormData(event.currentTarget);
    for (const person of people) {
      const next = String(data.get(`person-${person.id}`) ?? "").trim();
      if (next) updatePerson(person.id, { name: next });
    }
    toast("Household saved");
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Household</DialogTitle>
        <DialogDescription>
          Kids stay as names on the board — they do not need Google accounts.
          One adult Google calendar is enough for this kitchen screen.
        </DialogDescription>
      </DialogHeader>
      <Field label="House name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Theme">
        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto pr-1">
          {HUB_THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={theme === option.id}
              onClick={() => setTheme(option.id)}
              className={`flex flex-col items-start gap-2 rounded-lg border px-3 py-2 text-left font-sans ${
                theme === option.id
                  ? "border-forest bg-forest text-cream"
                  : "border-line bg-paper text-ink"
              }`}
            >
              <span className="font-medium">{option.label}</span>
              <span className="flex gap-1">
                {option.dots.map((dot) => (
                  <i
                    key={dot}
                    className="size-3 rounded-full"
                    style={{ background: dot }}
                    aria-hidden
                  />
                ))}
              </span>
            </button>
          ))}
        </div>
      </Field>
      {people.map((person) => (
        <Field
          key={person.id}
          label={person.role === "adult" ? "Adult" : "Child"}
        >
          <div className="flex flex-col gap-2">
            <Input name={`person-${person.id}`} defaultValue={person.name} />
            <div className="flex flex-wrap gap-2">
              {PERSON_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Colour ${color}`}
                  onClick={() => updatePerson(person.id, { color })}
                  className="size-8 rounded-full border border-line"
                  style={{
                    background: color,
                    outline:
                      person.color === color ? "2px solid var(--color-ink)" : undefined,
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
        </Field>
      ))}
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Close
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
