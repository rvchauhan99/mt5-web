import { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type Props = PropsWithChildren<{
  cols?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  /** When true, uses solar-style `gap-2` (compact ERP) regardless of `gap`. */
  compact?: boolean;
  className?: string;
}>;

const colsMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const gapMap: Record<string, string> = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

export function FormGrid({ cols = 2, gap = "md", compact = false, className, children }: Props) {
  return (
    <div className={cn("grid w-full", colsMap[cols], compact ? "gap-2" : gapMap[gap], className)}>
      {children}
    </div>
  );
}
