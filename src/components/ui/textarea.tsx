import * as React from "react";

import { fieldControl } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldControl, "min-h-24 resize-y px-3 py-2.5 leading-5", className)}
      {...props}
    />
  );
}
