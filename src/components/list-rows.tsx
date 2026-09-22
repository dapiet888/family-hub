import { Trash2 } from "lucide-react";
import { type ListItem, useHubStore } from "@/lib/hub-store";
import { cn } from "@/lib/utils";

export function ListRows({
  listId,
  items,
  allowDelete = false,
}: {
  listId: string;
  items?: ListItem[];
  allowDelete?: boolean;
}) {
  const list = useHubStore((s) => s.lists.find((l) => l.id === listId));
  const people = useHubStore((s) => s.people);
  const toggleItem = useHubStore((s) => s.toggleItem);
  const removeItem = useHubStore((s) => s.removeItem);
  const rows = items ?? list?.items ?? [];

  if (!list) return null;
  if (rows.length === 0) {
    return <p className="px-1 py-6 font-sans text-muted">List is clear.</p>;
  }

  return (
    <ul className="flex flex-col">
      {rows.map((item) => {
        const who = people.find((p) => p.id === item.personId);
        return (
          <li
            key={item.id}
            className="flex min-h-12 items-center gap-3 border-b border-paper-2 py-1.5"
          >
            <button
              type="button"
              aria-label={item.done ? "Mark not done" : "Mark done"}
              onClick={() => toggleItem(listId, item.id)}
              className={cn(
                "size-6 shrink-0 rounded-sm border-2 border-forest",
                item.done && "bg-forest",
              )}
            />
            <button
              type="button"
              onClick={() => toggleItem(listId, item.id)}
              className="min-w-0 flex-1 text-left"
            >
              <span
                className={cn(
                  "block font-sans text-base text-ink",
                  item.done && "text-muted line-through",
                )}
              >
                {item.text}
              </span>
            </button>
            {who ? (
              <em className="shrink-0 font-sans text-xs not-italic text-muted">
                {who.name}
              </em>
            ) : null}
            {allowDelete ? (
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => removeItem(listId, item.id)}
                className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
