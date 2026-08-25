"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/shadcn/input";
import { IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

/**
 * Standardized SearchInput component for all search use cases.
 * Consistent styling across all search implementations.
 *
 * @example
 * <SearchInput
 *   placeholder="Search..."
 *   value={searchQuery}
 *   onChange={(e) => setSearchQuery(e.target.value)}
 * />
 */
const SearchInput = forwardRef(function SearchInput(
  {
    placeholder = "Search...",
    value,
    onChange,
    onKeyDown,
    onFocus,
    fullWidth = false,
    maxWidth = null,
    size,
    className,
    ...otherProps
  },
  ref
) {
  const style = maxWidth && typeof maxWidth === "number" ? { maxWidth: maxWidth } : undefined;
  return (
    <div
      className={cn(
        "relative",
        fullWidth ? "w-full" : "w-auto",
        maxWidth && typeof maxWidth !== "number" && !fullWidth && "max-w-[320px]"
      )}
      style={style}
    >
      <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        type="search"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className={cn(
          "pl-9",
          size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
          className
        )}
        {...otherProps}
      />
    </div>
  );
});

SearchInput.displayName = "SearchInput";

export default SearchInput;
