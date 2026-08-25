import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import { formControlFocus, formControlFocusError } from "@/lib/formControlClasses";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  errorMessage?: string;
  placeholder?: string;
};

/**
 * Select — native select with brand focus border, error state, and placeholder option.
 */
export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className, error, errorMessage, placeholder, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            "h-10 w-full rounded-md border bg-white px-3 text-[15px] font-medium text-gray-800",
            "transition-[border-color,box-shadow] outline-none",
            error ? formControlFocusError : formControlFocus,
            error ? "border-[var(--danger)]" : "border-[var(--border)]",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {error && errorMessage && (
          <p className="mt-1 text-sm text-[var(--danger)]">{errorMessage}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
