"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  children: ReactNode;
  error?: boolean;
  helperText?: string | null;
  className?: string;
  /** @deprecated Prefer className; kept for solar API compatibility */
  sx?: Record<string, unknown>;
};

/**
 * Wrapper for consistent field spacing and error line (solar-aligned).
 */
export function FormField({ children, error = false, helperText = null, className }: FormFieldProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
      {error && helperText && <p className="mt-1.5 ml-0 text-xs text-destructive">{helperText}</p>}
    </div>
  );
}
