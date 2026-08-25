"use client";

import { Toaster } from "sonner";

/**
 * Global toast host — styled with CrickERP CSS tokens (see globals.css / tokens.css).
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "font-sans border border-[var(--border)] bg-[var(--surface-card)] text-[var(--foreground)] shadow-lg",
          title: "text-[var(--foreground)] font-medium",
          description: "text-[var(--text-secondary)] text-sm",
          success: "border-l-4 !border-l-[var(--brand-accent)]",
          error: "border-l-4 !border-l-[var(--danger)]",
          closeButton:
            "bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--accent)]",
        },
      }}
    />
  );
}
