import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground transition-colors outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]/40 focus:border-[color:var(--brand-primary)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 min-h-[72px]",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
