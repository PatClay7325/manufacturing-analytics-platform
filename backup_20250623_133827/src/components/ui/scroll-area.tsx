import * as React from "react"
import { clsx } from "clsx"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal" | "both"
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "relative overflow-hidden",
          className
        )}
        {...props}
      >
        <div
          className={clsx(
            "h-full w-full rounded-[inherit]",
            {
              "overflow-y-auto": orientation === "vertical" || orientation === "both",
              "overflow-x-auto": orientation === "horizontal" || orientation === "both",
              "overflow-auto": orientation === "both",
            }
          )}
        >
          {children}
        </div>
      </div>
    )
  }
)
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      "flex touch-none select-none transition-colors",
      className
    )}
    {...props}
  />
))
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }