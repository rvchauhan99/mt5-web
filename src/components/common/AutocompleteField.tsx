"use client";

import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export type AutocompleteOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (nextValue: string) => void;
  loadOptions: (query: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  disabled?: boolean;
  debounceMs?: number;
  emptyText?: string;
  /**
   * When `value` is set but that option is not in the loaded list yet (e.g. edit form opened
   * before the dropdown), use this label so the input does not appear empty. Must match `value`.
   */
  defaultOption?: AutocompleteOption | null;
  /**
   * Optional async resolver (e.g. GET-by-id). Used when `value` is set, not in `options`, and
   * `defaultOption` is absent or does not match — same idea as techhind `resolveOptionById`.
   */
  resolveOptionByValue?: (value: string) => Promise<AutocompleteOption | null>;
  /** Auto-pick single match while typing (query must be non-empty). */
  autoSelectSingleOption?: boolean;
};

export function AutocompleteField({
  value,
  onChange,
  loadOptions,
  placeholder = "Search...",
  disabled = false,
  debounceMs = 300,
  emptyText = "No records found",
  defaultOption = null,
  resolveOptionByValue,
  autoSelectSingleOption = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedOption, setSelectedOption] = useState<AutocompleteOption | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  /** Portal dropdown — outside `rootRef` so parent `overflow:hidden` does not clip options. */
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  /** Keeps label when `value` is controlled but the option is not in `options` yet (user pick or default/resolve). */
  const selectedCacheRef = useRef<AutocompleteOption | null>(null);
  const loadOptionsRef = useRef(loadOptions);
  loadOptionsRef.current = loadOptions;
  const resolveOptionByValueRef = useRef(resolveOptionByValue);
  resolveOptionByValueRef.current = resolveOptionByValue;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const defaultResolveAttemptRef = useRef<string | null>(null);
  /** Avoid repeated `loadOptions("")` when value is still missing from the loaded page. */
  const emptySearchAttemptRef = useRef<string | null>(null);

  const [dropdownBox, setDropdownBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updateDropdownPosition = useCallback(() => {
    if (!rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    const gap = 4;
    const viewportH = window.innerHeight;
    const preferredMax = 14 * 16; /* ~max-h-56 */
    const spaceBelow = viewportH - r.bottom - gap - 8;
    const maxHeight = Math.min(preferredMax, Math.max(80, spaceBelow));
    setDropdownBox({
      top: r.bottom + gap,
      left: r.left,
      width: r.width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || disabled) {
      setDropdownBox(null);
      return;
    }
    updateDropdownPosition();
  }, [open, disabled, updateDropdownPosition, options.length, loading]);

  useEffect(() => {
    if (!open || disabled) return;
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, disabled, updateDropdownPosition]);

  const runLoad = useCallback(
    async (text: string) => {
      setLoading(true);
      try {
        const rows = await loadOptionsRef.current(text);
        setOptions(rows);
        const normalizedQuery = text.trim();
        if (
          autoSelectSingleOption &&
          normalizedQuery.length > 0 &&
          rows.length === 1 &&
          rows[0] &&
          rows[0].value !== valueRef.current
        ) {
          const picked = rows[0];
          selectedCacheRef.current = picked;
          setSelectedOption(picked);
          onChangeRef.current(picked.value);
          setOpen(false);
          setQuery("");
        }
      } finally {
        setLoading(false);
      }
    },
    [autoSelectSingleOption],
  );

  // Sync display label when value / options / defaultOption change (mirrors techhind selected-option cache).
  useEffect(() => {
    if (!value) {
      selectedCacheRef.current = null;
      setSelectedOption(null);
      return;
    }
    const fromList = options.find((opt) => opt.value === value);
    if (fromList) {
      selectedCacheRef.current = fromList;
      setSelectedOption(fromList);
      return;
    }
    if (defaultOption && defaultOption.value === value) {
      selectedCacheRef.current = defaultOption;
      setSelectedOption(defaultOption);
      return;
    }
    if (selectedCacheRef.current?.value === value) {
      setSelectedOption(selectedCacheRef.current);
      return;
    }
    setSelectedOption(null);
  }, [value, options, defaultOption]);

  // Pre-load with empty query once per value when we might find the option in the first page (no default label).
  useEffect(() => {
    if (!value || disabled || open) return;
    if (options.some((o) => o.value === value)) return;
    if (defaultOption?.value === value) return;
    if (selectedCacheRef.current?.value === value) return;
    if (resolveOptionByValue) return;
    if (emptySearchAttemptRef.current === value) return;
    emptySearchAttemptRef.current = value;

    let cancelled = false;
    (async () => {
      try {
        const rows = await loadOptionsRef.current("");
        if (cancelled) return;
        setOptions(rows);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, disabled, open, options, defaultOption, resolveOptionByValue]);

  useEffect(() => {
    if (!value) emptySearchAttemptRef.current = null;
  }, [value]);

  // Optional async resolve-by-id (techhind-style).
  useEffect(() => {
    if (!value) {
      defaultResolveAttemptRef.current = null;
      return;
    }
    if (!resolveOptionByValueRef.current) return;
    if (options.some((o) => o.value === value)) return;
    if (defaultOption?.value === value) return;
    if (defaultResolveAttemptRef.current === value) return;
    defaultResolveAttemptRef.current = value;

    let cancelled = false;
    (async () => {
      try {
        const opt = await resolveOptionByValueRef.current!(value);
        if (cancelled || !opt || opt.value !== value) return;
        selectedCacheRef.current = opt;
        setSelectedOption(opt);
        setOptions((prev) => (prev.some((o) => o.value === opt.value) ? prev : [...prev, opt]));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, options, defaultOption]);

  useEffect(() => {
    if (!open || disabled) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runLoad(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open, disabled, debounceMs, runLoad]);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (rootRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= options.length ? 0 : prev + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      const picked = options[activeIndex];
      selectedCacheRef.current = picked;
      setSelectedOption(picked);
      onChange(picked.value);
      setOpen(false);
      setQuery("");
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const displayText = open ? query : selectedOption?.label ?? "";

  const showClear = useMemo(() => Boolean(value) && !disabled, [value, disabled]);

  const dropdownList =
    open && dropdownBox ? (
      <ul
        ref={dropdownRef}
        className="fixed z-[200] overflow-auto rounded-md border border-[var(--border)] bg-white py-1 shadow-lg"
        style={{
          top: dropdownBox.top,
          left: dropdownBox.left,
          width: dropdownBox.width,
          maxHeight: dropdownBox.maxHeight,
        }}
        role="listbox"
      >
        {loading ? (
          <li className="px-3 py-2 text-sm text-gray-500">Loading...</li>
        ) : options.length === 0 ? (
          <li className="px-3 py-2 text-sm text-gray-500">{emptyText}</li>
        ) : (
          options.map((option, index) => (
            <li
              key={option.value}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                index === activeIndex ? "bg-[var(--brand-primary)] text-white" : "hover:bg-gray-50"
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                selectedCacheRef.current = option;
                setSelectedOption(option);
                onChange(option.value);
                setOpen(false);
                setQuery("");
              }}
            >
              {option.label}
            </li>
          ))
        )}
      </ul>
    ) : null;

  return (
    <div className="relative w-full" ref={rootRef}>
      <div className="relative">
        <Input
          value={displayText}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {showClear && (
          <button
            type="button"
            onClick={() => {
              selectedCacheRef.current = null;
              setSelectedOption(null);
              setQuery("");
              setOptions([]);
              onChange("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      {typeof document !== "undefined" && dropdownList
        ? createPortal(dropdownList, document.body)
        : null}
    </div>
  );
}
