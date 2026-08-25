import { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info" | "outline";

type Props = PropsWithChildren<{
  variant?: BadgeVariant;
  className?: string;
  size?: "sm" | "md";
}>;

const variants: Record<BadgeVariant, string> = {
  default:  "bg-gray-100 text-gray-700",
  primary:  "bg-blue-100 text-blue-800",
  success:  "bg-green-100 text-green-800",
  warning:  "bg-amber-100 text-amber-800",
  danger:   "bg-red-100 text-red-800",
  info:     "bg-sky-100 text-sky-800",
  outline:  "border border-[var(--border)] bg-white text-gray-700",
};

const sizes: Record<string, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
};

export function Badge({ variant = "default", size = "md", className, children }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
