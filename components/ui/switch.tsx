"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/components/base/lib/utils"

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
        "data-checked:bg-primary data-unchecked:bg-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 dark:data-unchecked:bg-input/80 shrink-0 rounded-full border border-transparent focus-visible:ring-1 aria-invalid:ring-1 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] peer group/switch relative inline-flex items-center transition-colors duration-200 ease-in-out outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-unchecked:bg-foreground dark:data-checked:bg-primary-foreground rounded-full absolute pointer-events-none block ring-0 transition-transform duration-200 ease-in-out",
          // Default size
          size === "default" && [
            "size-4 left-0.5",
            "group-data-[checked]/switch:translate-x-[14px]",
            "group-data-[unchecked]/switch:translate-x-0"
          ],
          // Small size
          size === "sm" && [
            "size-3 left-0.5",
            "group-data-[checked]/switch:translate-x-[10px]",
            "group-data-[unchecked]/switch:translate-x-0"
          ]
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
