"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { clsx } from "clsx"

// Select Root Component
interface SelectProps {
  children: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  name?: string
}

// Select Context
const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: HTMLButtonElement | null
  setTrigger: (trigger: HTMLButtonElement | null) => void
  disabled?: boolean
} | null>(null)

const Select: React.FC<SelectProps> = ({
  children,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  disabled,
  ...props
}) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const [trigger, setTrigger] = React.useState<HTMLButtonElement | null>(null)

  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen

  const handleValueChange = React.useCallback((newValue: string) => {
    if (controlledValue === undefined) {
      setUncontrolledValue(newValue)
    }
    onValueChange?.(newValue)
  }, [controlledValue, onValueChange])

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [controlledOpen, onOpenChange])

  return (
    <SelectContext.Provider 
      value={{ 
        value, 
        onValueChange: handleValueChange, 
        open, 
        onOpenChange: handleOpenChange,
        trigger,
        setTrigger,
        disabled
      }}
    >
      {children}
    </SelectContext.Provider>
  )
}

// Select Trigger Component
interface SelectTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  asChild?: boolean
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectTrigger must be used within Select")

    const { open, onOpenChange, disabled, setTrigger } = context

    React.useEffect(() => {
      if (ref && typeof ref === 'object' && ref.current) {
        setTrigger(ref.current)
      }
    }, [ref, setTrigger])

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={clsx(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onClick={() => onOpenChange(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

// Select Value Component
interface SelectValueProps {
  placeholder?: string
  asChild?: boolean
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within Select")

  const { value } = context

  return <span>{value || placeholder}</span>
}

// Select Content Component
interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "popper" | "item-aligned"
  sideOffset?: number
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, position = "popper", sideOffset = 4, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectContent must be used within Select")

    const { open, onOpenChange, trigger } = context

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref && typeof ref === 'object' && ref.current && 
            !ref.current.contains(event.target as Node) &&
            trigger && !trigger.contains(event.target as Node)) {
          onOpenChange(false)
        }
      }

      if (open) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [open, onOpenChange, trigger, ref])

    if (!open) return null

    return (
      <div
        ref={ref}
        className={clsx(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          position === "popper" && "mt-1",
          className
        )}
        data-state={open ? "open" : "closed"}
        {...props}
      >
        <div className="w-full p-1">
          {children}
        </div>
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

// Select Item Component
interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectItem must be used within Select")

    const { value: selectedValue, onValueChange, onOpenChange } = context

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={selectedValue === value}
        data-disabled={disabled}
        className={clsx(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
          selectedValue === value && "bg-accent text-accent-foreground",
          className
        )}
        onClick={() => {
          if (!disabled) {
            onValueChange(value)
            onOpenChange(false)
          }
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }