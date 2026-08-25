"use client";

import Link from "next/link";
import { IconMenu2, IconMaximize, IconMinimize } from "@tabler/icons-react";
import { PLATFORM_NAME } from "@/lib/constants/branding";

type Props = {
  onOpenSidebar: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

export function Topbar({ onOpenSidebar, isFullscreen, onToggleFullscreen }: Props) {
  return (
    <header className="sticky top-0 z-[var(--z-topbar)] flex h-14 items-center justify-between border-b border-[var(--border)] bg-white px-4 shadow-sm md:hidden">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-gray-50 transition-colors"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <IconMenu2 className="h-5 w-5 text-gray-700" />
      </button>

      <Link href="/dashboard" className="flex items-center gap-1.5">
        <span className="text-base font-bold text-[var(--brand-primary)]">{PLATFORM_NAME}</span>
      </Link>

      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-gray-50 transition-colors"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? (
          <IconMinimize className="h-5 w-5 text-gray-700" />
        ) : (
          <IconMaximize className="h-5 w-5 text-gray-700" />
        )}
      </button>
    </header>
  );
}
