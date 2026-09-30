"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 duration-300 data-[size=default]:h-[31px] data-[size=default]:w-[51px] data-[size=sm]:h-[22px] data-[size=sm]:w-[36px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-success data-unchecked:bg-muted-foreground/25 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block translate-x-[2px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] ring-0 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[size=default]/switch:size-[27px] group-data-[size=sm]/switch:size-[18px] group-data-[size=default]/switch:data-checked:translate-x-[22px] group-data-[size=sm]/switch:data-checked:translate-x-[16px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
