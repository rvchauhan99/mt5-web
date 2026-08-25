"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { Label } from "@/components/ui/shadcn/label";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";
import { IconX } from "@tabler/icons-react";

/** MenuItem-compatible option (solar API). */
export function MenuItem({ value, children }: { value?: string | number | null; children?: ReactNode }) {
  return (
    <SelectItem className="" value={value == null ? "" : String(value)}>
      {children}
    </SelectItem>
  );
}

export type FormSelectProps = {
  name?: string;
  label?: ReactNode;
  value?: string | number | null;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  children?: ReactNode;
  error?: boolean;
  helperText?: string | null;
  fullWidth?: boolean;
  size?: "small" | "medium";
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  renderValue?: ((value: string) => ReactNode) | null;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
};

/**
 * Solar-aligned labeled select with optional clear. Children: MenuItem or SelectItem with value.
 */
export const FormSelect = forwardRef<HTMLDivElement, FormSelectProps>(function FormSelect(
  {
    name,
    label,
    value,
    onChange,
    children,
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    multiple = false,
    disabled = false,
    required = false,
    renderValue = null,
    placeholder = "Select...",
    clearable = true,
    className,
    ...otherProps
  },
  ref
) {
  const stringValue = value == null ? "" : String(value);

  const options = Children.toArray(children)
    .filter((child): child is ReactElement<{ value?: unknown; children?: ReactNode }> => {
      if (!isValidElement(child)) return false;
      const p = child.props as { value?: unknown };
      return (
        child.type === SelectItem || child.type === MenuItem || p?.value != null
      );
    })
    .map((child) => {
      const v = child.props?.value;
      const labelText =
        typeof child.props?.children === "string" ? child.props.children : child.props?.children;
      return {
        value: v == null ? "" : String(v),
        label: labelText ?? String(v),
      };
    });

  const handleValueChange = (v: string) => {
    onChange?.({ target: { name, value: v ?? "" } });
  };

  if (multiple) {
    return (
      <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
        {label && (
          <Label className="mb-1.5 block text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        <p className="text-sm text-muted-foreground">
          Multiple select is not supported here; use a dedicated multi-select component.
        </p>
        {error && helperText && <p className="mt-1.5 text-xs text-destructive">{helperText}</p>}
      </div>
    );
  }

  return (
    <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")} ref={ref as Ref<HTMLDivElement>}>
      {label && (
        <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <ShadcnSelect
        value={stringValue === "" ? "__empty__" : stringValue}
        onValueChange={(v: string) => handleValueChange(v === "__empty__" ? "" : v)}
        disabled={disabled}
        {...otherProps}
      >
        <SelectTrigger
          id={name}
          className={cn(
            "relative w-full",
            size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
            error && "border-destructive",
            className
          )}
        >
          <SelectValue placeholder={placeholder}>
            {renderValue
              ? renderValue(stringValue)
              : stringValue
                ? (options.find((o) => o.value === stringValue)?.label ?? stringValue)
                : placeholder}
          </SelectValue>
          {clearable && !disabled && stringValue !== "" && (
            <span
              role="button"
              tabIndex={0}
              className="absolute inset-y-0 right-7 flex items-center text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleValueChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleValueChange("");
                }
              }}
              aria-label="Clear selection"
              title="Clear selection"
            >
              <IconX className="h-3.5 w-3.5" />
            </span>
          )}
        </SelectTrigger>
        <SelectContent className="">
          <SelectItem className="" value="__empty__">
            {placeholder}
          </SelectItem>
          {Children.map(children, (child) => {
            if (!isValidElement(child)) return null;
            const p = child.props as { value?: unknown; children?: ReactNode };
            const v = p?.value;
            if (v == null && child.type !== SelectItem && child.type !== MenuItem) return null;
            const val = v == null ? "" : String(v);
            if (val === "__empty__" || val === "") return null;
            return (
              <SelectItem className="" key={val} value={val}>
                {p.children}
              </SelectItem>
            );
          })}
        </SelectContent>
      </ShadcnSelect>
      {error && helperText && <p className="mt-1.5 text-xs text-destructive">{helperText}</p>}
    </div>
  );
});

FormSelect.displayName = "FormSelect";
