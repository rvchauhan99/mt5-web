import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// MUI-style props that must not be forwarded to the DOM (strip and apply inputProps contents instead)
const DOM_EXCLUDED_PROPS = [
  "InputLabelProps",
  "InputProps",
  "inputProps",
  "FormControlProps",
  "FormHelperTextProps",
  "SelectProps",
  "startAdornment",
  "endAdornment",
];

const Input = forwardRef(function Input({ className, type, ...props }, ref) {
  const domProps = { ...props };
  const inputProps = domProps.inputProps;
  DOM_EXCLUDED_PROPS.forEach((key) => delete domProps[key]);
  if (inputProps && typeof inputProps === "object" && !Array.isArray(inputProps)) {
    Object.assign(domProps, inputProps);
  }
  // Satisfy React: value without onChange must be read-only
  if ("value" in domProps && domProps.onChange == null) {
    domProps.readOnly = true;
  }
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "w-full h-9 border border-border rounded-md px-2.5 py-1.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]/50 focus:border-[color:var(--brand-primary)] transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        className
      )}
      {...domProps}
    />
  );
});

export { Input };
