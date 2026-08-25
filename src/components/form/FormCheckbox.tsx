"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Label } from "@/components/ui/shadcn/label";
import { cn } from "@/lib/utils";
import { FIELD_TEXT_SMALL } from "@/utils/formConstants";

export type FormCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  name?: string;
  label?: ReactNode;
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onCheckedChange?: (checked: boolean) => void;
  error?: boolean;
  helperText?: string | null;
  required?: boolean;
};

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(function FormCheckbox(
  {
    name,
    label,
    checked = false,
    indeterminate = false,
    onChange,
    onCheckedChange,
    error = false,
    helperText = null,
    disabled = false,
    required = false,
    className,
    ...otherProps
  },
  ref
) {
  const innerRef = useRef<HTMLInputElement | null>(null);

  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [ref]
  );

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onCheckedChange?.(e.target.checked);
  };

  const isChecked = !!checked;

  return (
    <div className={cn("flex w-full flex-col gap-0.5", className)}>
      <label className="group flex cursor-pointer items-center gap-2">
        <input
          ref={setRef}
          type="checkbox"
          id={name}
          name={name}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "size-4 shrink-0 cursor-pointer appearance-none rounded border border-input bg-background transition-colors duration-150",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "checked:border-[color:var(--brand-primary)] checked:bg-no-repeat checked:bg-center checked:bg-[length:100%_100%]",
            error && "border-destructive"
          )}
          style={
            isChecked
              ? {
                  backgroundColor: "var(--brand-primary)",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M13 4L6 11L3 8'/%3E%3C/svg%3E")`,
                }
              : undefined
          }
          {...otherProps}
        />
        {label && (
          <Label
            htmlFor={name}
            className={cn(FIELD_TEXT_SMALL, "cursor-pointer font-medium group-disabled:opacity-50")}
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
      </label>
      {error && helperText && <p className="mt-1.5 text-xs text-destructive">{helperText}</p>}
    </div>
  );
});

FormCheckbox.displayName = "FormCheckbox";
