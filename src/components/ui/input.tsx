import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-md border border-line bg-panel px-3 font-sans text-base text-ink",
        "placeholder:text-muted outline-none transition-shadow duration-150",
        "focus-visible:ring-2 focus-visible:ring-forest/30",
        className,
      )}
      {...props}
    />
  );
}
