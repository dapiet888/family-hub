import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "font-sans text-sm font-medium text-ink",
        className,
      )}
      {...props}
    />
  );
}
