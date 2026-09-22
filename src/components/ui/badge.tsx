import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-paper px-2.5 py-1 font-sans text-xs font-medium text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
