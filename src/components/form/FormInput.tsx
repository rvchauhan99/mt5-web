"use client";

import {
  forwardRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { Input as ShadcnInput } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

export type FormInputProps = {
  name?: string;
  label?: ReactNode;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  error?: boolean;
  helperText?: string | null;
  fullWidth?: boolean;
  size?: "small" | "medium";
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>;
  InputProps?: InputHTMLAttributes<HTMLInputElement> & { sx?: unknown };
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "value" | "onChange" | "type">;

/**
 * Solar-aligned labeled input (shadcn primitives). Set `multiline` for notes/remarks.
 */
export const FormInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormInputProps>(
  function FormInput(props, ref) {
    const {
      name,
      label,
      value,
      onChange,
      type,
      error = false,
      helperText = null,
      fullWidth = true,
      size = "small",
      multiline = false,
      rows,
      disabled = false,
      required = false,
      className,
      inputProps = {},
      InputProps,
      ...rest
    } = props;

    const fromMui = { ...(InputProps ?? {}) } as Record<string, unknown>;
    delete fromMui.sx;
    const inputPropsFromMUI = fromMui as InputHTMLAttributes<HTMLInputElement>;
    const mergedInputProps = { ...inputProps, ...inputPropsFromMUI };

    const safeValue =
      type === "number"
        ? value == null || value === ""
          ? ""
          : String(value)
        : value == null
          ? ""
          : String(value);

    const numberInputProps =
      type === "number"
        ? {
            inputMode: "decimal" as const,
            step: (mergedInputProps as InputHTMLAttributes<HTMLInputElement>).step ?? "0.01",
            ...mergedInputProps,
            onWheel: (e: { currentTarget: HTMLInputElement }) => e.currentTarget.blur(),
          }
        : mergedInputProps;

    if (multiline) {
      return (
        <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
          {label && (
            <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
              {label}
              {required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
          )}
          <Textarea
            ref={ref as Ref<HTMLTextAreaElement>}
            id={name}
            name={name}
            value={safeValue}
            onChange={onChange}
            disabled={disabled}
            rows={rows ?? 3}
            className={cn(
              size === "small" && `min-h-9 ${FIELD_TEXT_SMALL}`,
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...(mergedInputProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
          {error && helperText && <p className="mt-1.5 text-xs text-destructive">{helperText}</p>}
        </div>
      );
    }

    return (
      <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
        {label && (
          <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        <ShadcnInput
          ref={ref as Ref<HTMLInputElement>}
          id={name}
          name={name}
          type={type}
          value={safeValue}
          onChange={onChange as (e: ChangeEvent<HTMLInputElement>) => void}
          disabled={disabled}
          className={cn(
            size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...(type === "number" ? numberInputProps : mergedInputProps)}
          {...rest}
        />
        {error && helperText && <p className="mt-1.5 text-xs text-destructive">{helperText}</p>}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
