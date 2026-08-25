"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SidebarTree } from "@/components/layout/SidebarTree";
import { PLATFORM_NAME } from "@/lib/constants/branding";
import {
  IconMenu2,
  IconX,
  IconArrowsMinimize,
  IconMaximize,
  IconMinimize,
} from "@tabler/icons-react";

const SIDEBAR_STORAGE_KEY = "crickierp-sidebar-collapsed";
const FOCUS_FULLSCREEN_KEY = "crickierp-focus-fullscreen";

function getStoredSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getStoredFocusFullscreen() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FOCUS_FULLSCREEN_KEY) === "true";
}

function isDialogOpen() {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(
    '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]'
  );
}

import { PropsWithChildren } from "react";
import { RoutePermissionGuard } from "@/components/layout/RoutePermissionGuard";

export function DashboardLayout({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getStoredSidebarCollapsed);
  const [sidebarHoverExpanded, setSidebarHoverExpanded] = useState(false);
  const [focusFullscreen, setFocusFullscreen] = useState(getStoredFocusFullscreen);
  const [docFullscreen, setDocFullscreen] = useState(false);
  const nativeFsSupported = typeof document !== "undefined" && !!document.fullscreenEnabled;

  const isFloatingHover = sidebarCollapsed && sidebarHoverExpanded;
  const layoutSidebarExpanded = !sidebarCollapsed;

  const persistFocusFullscreen = useCallback((next: boolean) => {
    setFocusFullscreen(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(FOCUS_FULLSCREEN_KEY, String(next));
    }
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!focusFullscreen && typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [focusFullscreen]);

  useEffect(() => {
    const sync = () => setDocFullscreen(!!document.fullscreenElement);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setFocusFullscreen((prev) => {
          const next = !prev;
          if (typeof window !== "undefined") {
            localStorage.setItem(FOCUS_FULLSCREEN_KEY, String(next));
          }
          return next;
        });
        return;
      }
      if (e.key === "Escape" && focusFullscreen) {
        if (isDialogOpen()) return;
        e.preventDefault();
        persistFocusFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focusFullscreen, persistFocusFullscreen]);

  const toggleDocumentFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Focus fullscreen: floating exit buttons */}
      {focusFullscreen && (
        <div className="fixed top-2 right-2 z-[1600] flex gap-1">
          {nativeFsSupported && (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-white/95 shadow-md backdrop-blur-sm hover:bg-gray-50 transition-colors"
              onClick={toggleDocumentFullscreen}
              aria-label={docFullscreen ? "Exit browser full screen" : "Browser full screen"}
              title={docFullscreen ? "Exit browser full screen" : "Browser full screen (hide browser UI)"}
            >
              {docFullscreen ? (
                <IconMinimize className="h-5 w-5 text-gray-700" />
              ) : (
                <IconMaximize className="h-5 w-5 text-gray-700" />
              )}
            </button>
          )}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-white/95 shadow-md backdrop-blur-sm hover:bg-gray-50 transition-colors"
            onClick={() => persistFocusFullscreen(false)}
            aria-label="Exit full screen"
            title="Exit full screen (Esc)"
          >
            <IconArrowsMinimize className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      )}

      {/* Sidebar: hidden in focus fullscreen */}
      {!focusFullscreen && (
        <div
          className={[
            "fixed inset-y-0 left-0 z-[var(--z-sidebar)] transform transition-all duration-300 ease-in-out lg:translate-x-0",
            layoutSidebarExpanded || isFloatingHover ? "w-72" : "w-[72px]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            isFloatingHover ? "shadow-xl" : "",
          ].join(" ")}
          onMouseEnter={() => sidebarCollapsed && setSidebarHoverExpanded(true)}
          onMouseLeave={() => setSidebarHoverExpanded(false)}
        >
          <SidebarTree
            open={sidebarOpen}
            collapsed={sidebarCollapsed && !sidebarHoverExpanded}
            onClose={() => setSidebarOpen(false)}
            onToggleCollapse={handleToggleCollapse}
            onToggleFullscreen={() => {
              setSidebarOpen(false);
              persistFocusFullscreen(true);
            }}
          />
        </div>
      )}

      {/* Mobile overlay */}
      {!focusFullscreen && sidebarOpen && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      {/* Main content */}
      <div
        className={[
          "flex flex-1 flex-col overflow-hidden transition-[padding] duration-300 ease-in-out",
          focusFullscreen
            ? "lg:pl-0"
            : layoutSidebarExpanded
            ? "lg:pl-72"
            : "lg:pl-[72px]",
        ].join(" ")}
      >
        {/* Mobile topbar: hidden in focus fullscreen */}
        {!focusFullscreen && (
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-white px-4 lg:hidden">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-gray-50 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            >
              {sidebarOpen ? (
                <IconX className="h-5 w-5 text-gray-700" />
              ) : (
                <IconMenu2 className="h-5 w-5 text-gray-700" />
              )}
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[var(--brand-primary)]">{PLATFORM_NAME}</span>
            </Link>
            <button
              type="button"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSidebarOpen(false);
                persistFocusFullscreen(true);
              }}
              aria-label="Full screen"
              title="Full screen"
            >
              <IconMaximize className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        )}

        {/* Page content */}
        <main
          className={
            focusFullscreen
              ? "flex-1 overflow-y-auto bg-[var(--background)] py-1 px-2"
              : "flex-1 overflow-y-auto bg-[var(--background)] py-2 px-3 lg:px-4"
          }
        >
          <RoutePermissionGuard>{children}</RoutePermissionGuard>
        </main>
      </div>
    </div>
  );
}
