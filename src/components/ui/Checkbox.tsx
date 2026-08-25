import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

/**
 * Checkbox component with brand styling.
 */
export const Checkbox = forwardRef<HTMLInputElement, Props>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className={cn("flex items-center gap-2 cursor-pointer select-none group", className)}>
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            ref={ref}
            className={cn(
              "peer h-4 w-4 rounded border border-[var(--border)] bg-white appearance-none transition-all",
              "checked:bg-[var(--brand-primary)] checked:border-[var(--brand-primary)]",
              "focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/20 focus-visible:ring-offset-0 outline-none",
              "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:border-gray-200"
            )}
            {...props}
          />
          <svg
            className="absolute h-2.5 w-2.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {label && <span className="text-sm font-medium text-gray-700 transition-colors group-hover:text-gray-900 group-disabled:text-gray-400">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
