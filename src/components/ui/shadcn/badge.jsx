import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors overflow-hidden rounded-full border border-transparent",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)]",
        navy: "bg-[color:var(--sidebar-bg)]/10 text-[color:var(--sidebar-bg)]",
        accent: "bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]",
        secondary: "bg-muted text-muted-foreground",
        destructive: "bg-destructive/10 text-destructive",
        success: "bg-[color:var(--success)]/10 text-[color:var(--success)]",
        outline: "border border-border text-foreground bg-card",
        ghost: "text-muted-foreground hover:bg-muted",
        link: "text-[color:var(--brand-primary)] underline hover:no-underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ className, variant }))}
      {...props}
    />
  );
}

export { badgeVariants };
