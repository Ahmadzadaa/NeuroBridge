import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 py-3 leading-relaxed  w-full min-w-0 rounded-xl border border-transparent bg-muted/60 px-3.5 text-base transition-[background-color,box-shadow,border-color] duration-200 outline-none placeholder:text-muted-foreground/80 hover:bg-muted focus-visible:border-primary/40 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/60 aria-invalid:ring-4 aria-invalid:ring-destructive/15 md:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
