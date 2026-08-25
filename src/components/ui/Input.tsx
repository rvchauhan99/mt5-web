import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import { formControlFocus, formControlFocusError } from "@/lib/formControlClasses";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  errorMessage?: string;
};

/**
 * Input — base form input with brand focus border and error state.
 */
export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, error, errorMessage, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "h-10 w-full rounded-md border bg-white px-3 text-[15px] font-medium text-gray-800 placeholder:font-normal placeholder:text-gray-400",
            "transition-[border-color,box-shadow] outline-none",
            error ? formControlFocusError : formControlFocus,
            error ? "border-[var(--danger)]" : "border-[var(--border)]",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
            className
          )}
          {...props}
        />
        {error && errorMessage && (
          <p className="mt-1 text-sm text-[var(--danger)]">{errorMessage}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
