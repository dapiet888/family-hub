import { useMemo, useState, type FormEvent } from "react";
import { RotateCcw } from "lucide-react";
import { catalogueIcon, SHOPPING_CATALOGUE, USUAL_NAMES } from "@/lib/catalogue";
import { useHubStore } from "@/lib/hub-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListRows } from "@/components/list-rows";
import { cn } from "@/lib/utils";

const NO_LAST: string[] = [];

export function ListsBoard() {
  const lists = useHubStore((s) => s.lists);
  const activeListId = useHubStore((s) => s.activeListId);
  const setActiveList = useHubStore((s) => s.setActiveList);
  const addList = useHubStore((s) => s.addList);
  const addItem = useHubStore((s) => s.addItem);
  const toggleCatalogueItem = useHubStore((s) => s.toggleCatalogueItem);
  const loadLastList = useHubStore((s) => s.loadLastList);
  const clearDone = useHubStore((s) => s.clearDone);
  const itemUses = useHubStore((s) => s.itemUses);
  const customItems = useHubStore((s) => s.customItems);
  const lastNames = useHubStore((s) => s.lastLists?.[activeListId] ?? NO_LAST);
  const people = useHubStore((s) => s.people);
  const list = lists.find((l) => l.id === activeListId) ?? lists[0];
  const [newList, setNewList] = useState(false);
  const [listName, setListName] = useState("");

  if (!list) return null;

  function onAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("text") ?? "").trim();
    if (!text) return;
    addItem(list.id, {
      text,
      personId: String(data.get("personId") ?? "") || undefined,
    });
    form.reset();
  }

  function onCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = listName.trim();
    if (!name) return;
    addList(name);
    setListName("");
    setNewList(false);
  }

  return (
    <div className="grid h-full min-h-[28rem] gap-3 md:grid-cols-[14rem_1fr]">
      <aside className="flex flex-col gap-2">
        {lists.map((entry) => {
          const open = entry.items.filter((i) => !i.done).length;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActiveList(entry.id)}
              className={cn(
                "min-h-14 rounded-lg border px-3 py-2.5 text-left font-sans",
                entry.id === list.id
                  ? "border-forest bg-forest text-cream"
                  : "border-line bg-panel text-ink",
              )}
            >
              <span className="block font-medium">{entry.name}</span>
              <span
                className={cn(
                  "text-sm",
                  entry.id === list.id ? "text-cream/80" : "text-muted",
                )}
              >
                {open} open
              </span>
            </button>
          );
        })}
        {newList ? (
          <form onSubmit={onCreateList} className="flex flex-col gap-2">
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="List name"
              autoFocus
            />
            <Button type="submit" size="sm">
              Create list
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setNewList(true)}
          >
            New list
          </Button>
        )}
      </aside>

      <section className="flex min-h-0 flex-col rounded-xl border border-line bg-panel p-4 shadow-panel sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">{list.name}</h2>
          <div className="flex flex-wrap gap-2">
            {list.kind === "shopping" && lastNames.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => loadLastList(list.id)}
              >
                <RotateCcw className="size-4" />
                Last list
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => clearDone(list.id)}
            >
              Clear done
            </Button>
          </div>
        </div>
        {list.kind === "shopping" ? (
          <Catalogue
            uses={itemUses ?? {}}
            customItems={customItems ?? []}
            selected={new Set(
              list.items.filter((item) => !item.done).map((item) => item.text.toLowerCase()),
            )}
            onPick={(name) => toggleCatalogueItem(list.id, name)}
            onAdd={(name) => addItem(list.id, { text: name })}
          />
        ) : (
          <form onSubmit={onAddItem} className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Input
              name="text"
              required
              placeholder={list.kind === "chores" ? "Add a chore" : "Add an item"}
            />
            {list.kind === "chores" ? (
              <select
                name="personId"
                className="h-12 rounded-md border border-line bg-panel px-3 font-sans text-base text-ink"
                defaultValue={people[0]?.id}
              >
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Button type="submit">Add</Button>
          </form>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          <ListRows listId={list.id} allowDelete />
        </div>
      </section>
    </div>
  );
}

function Catalogue({
  uses,
  customItems,
  selected,
  onPick,
  onAdd,
}: {
  uses: Record<string, number>;
  customItems: string[];
  selected: Set<string>;
  onPick: (name: string) => void;
  onAdd: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const options = useMemo(() => {
    const known = new Set(SHOPPING_CATALOGUE.map((item) => item.name.toLowerCase()));
    const yours = customItems
      .filter((name) => !known.has(name.toLowerCase()))
      .map((name) => ({ name, group: "Yours" }));
    return [...yours, ...SHOPPING_CATALOGUE.map((item) => ({ name: item.name, group: item.group }))];
  }, [customItems]);

  const frequent = useMemo(() => {
    const ranked = options
      .map((item) => ({ ...item, count: uses[item.name.toLowerCase()] ?? 0 }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 16);
    if (ranked.length > 0) return ranked;
    const usual = new Set<string>(USUAL_NAMES.map((name) => name.toLowerCase()));
    return options.filter((item) => usual.has(item.name.toLowerCase()));
  }, [options, uses]);

  const shown = needle
    ? options.filter((item) => item.name.toLowerCase().includes(needle)).slice(0, 24)
    : frequent;
  const exact = options.some((item) => item.name.toLowerCase() === needle);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    const match = options.find((item) => item.name.toLowerCase() === text.toLowerCase());
    onAdd(match?.name ?? text);
    setQuery("");
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type to find, or add a new item"
          aria-label="Find or add an item"
        />
        <Button type="submit">Add</Button>
      </form>
      <div>
        <p className="mb-1.5 font-sans text-xs font-medium uppercase tracking-wide text-muted">
          {needle ? "Matches" : frequent.some((item) => (uses[item.name.toLowerCase()] ?? 0) > 0) ? "Your usual" : "Start here"}
        </p>
        <div className="flex flex-wrap gap-2">
          {needle && !exact ? (
            <button
              type="button"
              onClick={() => {
                onAdd(query.trim());
                setQuery("");
              }}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-forest bg-paper px-3 font-sans text-sm text-ink"
            >
              Add “{query.trim()}”
            </button>
          ) : null}
          {shown.map((item) => {
            const on = selected.has(item.name.toLowerCase());
            const Icon = catalogueIcon(item.name);
            return (
              <button
                key={item.name}
                type="button"
                aria-pressed={on}
                onClick={() => onPick(item.name)}
                className={cn(
                  "inline-flex h-12 items-center gap-2 rounded-full border px-3 font-sans text-sm",
                  on
                    ? "border-forest bg-forest text-cream"
                    : "border-line bg-paper text-ink",
                )}
              >
                <Icon className="size-4" />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
