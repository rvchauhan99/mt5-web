/**
 * Single-cue focus: brand border only.
 * Use both :focus and :focus-visible so mouse-driven focus never keeps a stray ring/shadow,
 * and ring-0 always wins over any merged className.
 */
export const formControlFocus =
  "focus:border-[var(--brand-primary)] focus:outline-none focus:ring-0 " +
  "focus-visible:border-[var(--brand-primary)] focus-visible:ring-0";

/** Error field: danger border on focus, no second ring. */
export const formControlFocusError =
  "focus:border-[var(--danger)] focus:outline-none focus:ring-0 " +
  "focus-visible:border-[var(--danger)] focus-visible:ring-0";
