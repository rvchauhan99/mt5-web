import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] shadow-sm",
        secondary: "bg-white text-gray-700 border border-[var(--border)] hover:bg-gray-50 shadow-sm",
        outline: "bg-transparent text-[var(--brand-primary)] border border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        danger: "bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 shadow-sm",
        success: "bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent)]/90 shadow-sm",
        link: "text-[var(--brand-primary)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md gap-1",
        sm: "h-9 px-3 text-sm rounded-md gap-1.5",
        md: "h-10 px-4 text-sm rounded-lg gap-2",
        lg: "h-11 px-6 text-base rounded-lg gap-2.5",
        icon: "h-10 w-10 rounded-lg p-0",
        "icon-sm": "h-8 w-8 rounded-md p-0",
        "icon-xs": "h-6 w-6 rounded-md p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      disabled,
      startIcon,
      endIcon,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <IconLoader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
        )}
        {!loading && startIcon && (
          <span className="shrink-0 [&>svg]:size-4">{startIcon}</span>
        )}
        {size !== "icon" && size !== "icon-sm" && size !== "icon-xs" && children}
        {!loading && endIcon && (
          <span className="shrink-0 [&>svg]:size-4">{endIcon}</span>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
