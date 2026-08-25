"use client";

import { forwardRef, type ChangeEvent, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { Textarea as UiTextarea } from "@/components/ui/shadcn/textarea";
import { Label } from "@/components/ui/shadcn/label";
import { cn } from "@/lib/utils";
import { FIELD_TEXT_SMALL } from "@/utils/formConstants";

export type FormTextareaProps = {
  name?: string;
  label?: ReactNode;
  value?: string | number | null;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  error?: boolean;
  helperText?: string | null;
  fullWidth?: boolean;
  size?: "small" | "medium";
  minRows?: number;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">;

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea(
  {
    name,
    label,
    value,
    onChange,
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    minRows = 3,
    rows,
    disabled = false,
    required = false,
    placeholder,
    className,
    ...otherProps
  },
  ref
) {
  const safeValue = value == null ? "" : value;
  const rowCount = rows ?? minRows;

  return (
    <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
      {label && (
        <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <UiTextarea
        ref={ref as Ref<HTMLTextAreaElement>}
        id={name}
        name={name}
        value={safeValue}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        rows={rowCount}
        className={cn(
          size === "small" && FIELD_TEXT_SMALL,
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...otherProps}
      />
      {error && helperText && <p className="mt-1.5 text-xs text-destructive">{helperText}</p>}
    </div>
  );
});

FormTextarea.displayName = "FormTextarea";
