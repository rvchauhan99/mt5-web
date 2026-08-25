"use client";

import { useState } from "react";

type Props = {
  label: string;
  children: React.ReactNode;
};

export function Tooltip({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open ? (
        <span className="absolute -top-8 left-1/2 z-50 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs text-white">
          {label}
        </span>
      ) : null}
    </span>
  );
}
