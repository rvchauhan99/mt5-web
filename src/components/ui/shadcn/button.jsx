"use client";

import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium outline-none transition-all disabled:pointer-events-none disabled:opacity-50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--brand-primary)] text-white hover:bg-[color:var(--brand-primary-hover)] shadow-sm",
        outline:
          "border border-[color:var(--brand-primary)] bg-white text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary)]/5 shadow-sm",
        secondary: "bg-[color:var(--sidebar-bg)] text-white hover:bg-[color:var(--sidebar-active)]",
        ghost: "hover:bg-muted hover:text-foreground text-muted-foreground",
        destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-sm",
        success: "bg-[color:var(--success)] text-white hover:bg-[color:var(--success)]/90 shadow-sm",
        link: "text-[color:var(--brand-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 px-2 text-xs rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-10 px-6 rounded-md",
        icon: "h-9 w-9",
        "icon-xs": "h-6 w-6 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  disabled,
  startIcon,
  endIcon,
  fullWidth,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button";
  const isDisabled = disabled ?? loading;
  const resolvedVariant = variant === "contained" ? "default" : variant;

  const content = loading ? (
    <span className="inline-flex items-center justify-center gap-1.5">
      <IconLoader2 className="size-4 animate-spin shrink-0" aria-hidden />
      {children != null && children !== "" ? (
        <span className="ml-1.5">{children}</span>
      ) : null}
    </span>
  ) : (
    <span className="inline-flex items-center justify-center gap-1.5">
      {startIcon ? <span className="-ml-0.5 shrink-0 [&>svg]:size-4" data-icon="inline-start">{startIcon}</span> : null}
      {children}
      {endIcon ? <span className="-mr-0.5 shrink-0 [&>svg]:size-4" data-icon="inline-end">{endIcon}</span> : null}
    </span>
  );

  return (
    <Comp
      {...props}
      data-slot="button"
      data-variant={resolvedVariant}
      data-size={size}
      className={cn(
        buttonVariants({ variant: resolvedVariant, size, className }),
        fullWidth && "w-full"
      )}
      disabled={isDisabled}
      aria-busy={loading}
    >
      {content}
    </Comp>
  );
}

export { buttonVariants };
