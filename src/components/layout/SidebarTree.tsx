"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_ITEMS, filterNavForUser } from "@/lib/constants/navigation";
import { AppNavNode } from "@/types/navigation";
import { cn } from "@/lib/cn";
import { useAuth } from "@/context/AuthContext";
import { PLATFORM_NAME } from "@/lib/constants/branding";
import {
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconSettings,
  IconLogout,
  IconSearch,
  IconMaximize,
  IconX,
} from "@tabler/icons-react";

// ─────────── Helpers ───────────

function getNodeGlyph(node: AppNavNode): string {
  const source = (node.label || node.id || "x").trim();
  return source.slice(0, 2).toUpperCase();
}

function getDepthPadding(depth: number): string {
  return `${12 + depth * 12}px`;
}

function nodeMatches(node: AppNavNode, query: string): boolean {
  const q = query.toLowerCase();
  const selfMatch =
    node.label.toLowerCase().includes(q) ||
    (node.keywords ?? []).some((key) => key.toLowerCase().includes(q));
  if (selfMatch) return true;
  return (node.children ?? []).some((child) => nodeMatches(child, query));
}

function nodeHasPath(node: AppNavNode, pathname: string): boolean {
  if (node.href === pathname) return true;
  return (node.children ?? []).some((child) => nodeHasPath(child, pathname));
}

function getFirstHref(node: AppNavNode): string {
  if (node.href) return node.href;
  if (node.children?.length) return getFirstHref(node.children[0]);
  return "#";
}

function flattenNodes(nodes: AppNavNode[], parents: string[] = []): Array<AppNavNode & { fullPath: string }> {
  let result: Array<AppNavNode & { fullPath: string }> = [];
  for (const node of nodes) {
    const fullPath = [...parents, node.label].join(" › ");
    result.push({ ...node, fullPath });
    if (node.children?.length) {
      result = result.concat(flattenNodes(node.children, [...parents, node.label]));
    }
  }
  return result;
}

// ─────────── TreeNode ───────────

function TreeNode({
  node,
  pathname,
  collapsed,
  onNavigate,
  depth = 0,
}: {
  node: AppNavNode;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  depth?: number;
}) {
  const hasChildren = (node.children ?? []).length > 0;
  const hasActiveChild = (node.children ?? []).some((child) => nodeHasPath(child, pathname));
  const [open, setOpen] = useState(hasActiveChild);
  const isActive = node.href === pathname || hasActiveChild;

  const activeClass = "bg-[#142847] text-white border-[#1d4ed8]";
  const inactiveClass = "text-blue-100 hover:bg-[#142847] hover:text-white border-transparent";

  if (hasChildren) {
    if (collapsed) {
      return (
        <Link
          href={getFirstHref(node)}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-l-4 transition-all duration-200",
            isActive ? activeClass : inactiveClass
          )}
          title={node.label}
          onClick={onNavigate}
        >
          <span className={cn(
            "inline-flex h-[18px] w-[18px] items-center justify-center rounded text-[9px] font-bold",
            isActive ? "bg-blue-400/20 text-white" : "bg-white/10 text-blue-200"
          )}>
            {getNodeGlyph(node)}
          </span>
        </Link>
      );
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border-l-4 px-3 py-1.5 text-sm font-medium transition-colors",
            isActive ? activeClass : inactiveClass
          )}
          style={{ paddingLeft: getDepthPadding(depth) }}
        >
          <span className={cn(
            "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[9px] font-bold",
            isActive ? "bg-blue-400/20 text-white" : "bg-white/10 text-blue-200"
          )}>
            {getNodeGlyph(node)}
          </span>
          <span className="flex-1 text-left truncate">{node.label}</span>
          <div className="relative h-4 w-4 shrink-0">
            <IconChevronDown
              className={cn(
                "absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out",
                open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
              )}
            />
            <IconChevronRight
              className={cn(
                "absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out",
                open ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
              )}
            />
          </div>
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="mt-1 ml-[19px] border-l border-white/10 pl-2">
            {node.children!.map((child, index) => (
              <div
                key={child.id}
                className={cn(
                  "transition-all duration-300 ease-in-out",
                  open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                )}
                style={{ transitionDelay: open ? `${index * 30}ms` : "0ms" }}
              >
                <TreeNode
                  node={child}
                  pathname={pathname}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <Link
        href={node.href ?? "#"}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-l-4 transition-all duration-200",
          isActive ? activeClass : inactiveClass
        )}
        title={node.label}
        onClick={onNavigate}
      >
        <span className={cn(
          "inline-flex h-[18px] w-[18px] items-center justify-center rounded text-[9px] font-bold",
          isActive ? "bg-blue-400/20 text-white" : "bg-white/10 text-blue-200"
        )}>
          {getNodeGlyph(node)}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={node.href ?? "#"}
      className={cn(
        "flex items-center gap-2 rounded-md border-l-4 px-3 py-1.5 text-sm font-medium transition-colors",
        isActive ? activeClass : inactiveClass
      )}
      style={{ paddingLeft: getDepthPadding(depth) }}
      onClick={onNavigate}
    >
      <span className={cn(
        "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[9px] font-bold",
        isActive ? "bg-blue-400/20 text-white" : "bg-white/10 text-blue-200"
      )}>
        {getNodeGlyph(node)}
      </span>
      <span className="truncate">{node.label}</span>
    </Link>
  );
}

// ─────────── UserProfile ───────────

function UserProfile({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = (user?.fullName?.[0] || "U").toUpperCase();
  const name = user?.fullName ?? "User";
  const email = user?.role ?? "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (collapsed) {
    return (
      <div ref={ref} className="relative flex justify-center">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d4ed8] text-white text-xs font-semibold hover:bg-[#1e40af] transition-colors"
          title={name}
          onClick={() => setOpen((p) => !p)}
        >
          {initial}
        </button>
        {open && (
          <div className="absolute top-0 left-full ml-2 w-48 rounded-lg border border-[#0f1f3a] bg-[#1b365d] shadow-xl z-50">
            <div className="p-3 border-b border-white/10">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              <p className="text-xs text-blue-300 truncate">{email}</p>
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-100 hover:bg-[#142847] hover:text-white transition-colors"
              onClick={() => { router.push("/profile"); setOpen(false); }}
            >
              <IconSettings className="h-4 w-4" />
              <span>Profile</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors rounded-b-lg"
              onClick={() => { onLogout(); setOpen(false); }}
            >
              <IconLogout className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md p-2 hover:bg-[#142847] transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-white text-xs font-semibold">
          {initial}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-blue-100">{name}</p>
          <p className="truncate text-xs text-blue-300/70">{email}</p>
        </div>
        <IconChevronDown className="h-4 w-4 shrink-0 text-blue-300/70" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-[#0f1f3a] bg-[#1b365d] shadow-xl z-50">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-100 hover:bg-[#142847] hover:text-white transition-colors rounded-t-lg"
            onClick={() => { router.push("/profile"); setOpen(false); }}
          >
            <IconSettings className="h-4 w-4" />
            <span>Profile</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors rounded-b-lg"
            onClick={() => { onLogout(); setOpen(false); }}
          >
            <IconLogout className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────── SidebarTree (main export) ───────────

type Props = {
  open: boolean;
  collapsed?: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  onToggleFullscreen: () => void;
};

export function SidebarTree({
  open,
  collapsed = false,
  onClose,
  onToggleCollapse,
  onToggleFullscreen,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [menuSearch, setMenuSearch] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const navItemsForUser = useMemo(
    () => filterNavForUser(NAV_ITEMS, user?.role, user?.permissions),
    [user?.role, user?.permissions]
  );

  const flatItems = useMemo(() => flattenNodes(navItemsForUser), [navItemsForUser]);

  const searchResults = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return [];
    return flatItems
      .filter(
        (item) =>
          item.label?.toLowerCase().includes(q) ||
          item.fullPath?.toLowerCase().includes(q) ||
          item.href?.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [menuSearch, flatItems]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuSearch.trim() &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setMenuSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuSearch]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const filteredNodes = useMemo(() => {
    if (!menuSearch.trim()) return navItemsForUser;
    return navItemsForUser.filter((node) => nodeMatches(node, menuSearch));
  }, [menuSearch, navItemsForUser]);

  const visibleNodes = collapsed ? navItemsForUser : filteredNodes;

  const handleLogout = () => {
    logout().finally(() => {
      router.replace("/login");
    });
  };

  const sidebarContent = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4">
      {/* User Profile — outside scroll so profile dropdown (above) is not clipped */}
      <div className="mb-4 shrink-0">
        <UserProfile collapsed={collapsed} onLogout={handleLogout} />
      </div>

      {/* Search (expanded only) */}
      {!collapsed && (
        <div ref={searchContainerRef} className="relative mb-4 shrink-0">
          <div className="relative">
            <IconSearch className="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-blue-300/70" />
            <input
              type="text"
              placeholder="Search menus..."
              className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-sm text-blue-100 placeholder:text-blue-300/50 transition-[border-color,box-shadow] outline-none focus:border-blue-400/40 focus:ring-0 focus-visible:border-blue-400/40 focus-visible:ring-0"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setMenuSearch(""); }}
            />
          </div>
          {menuSearch.trim() && (
            <div
              data-sidebar-search-dropdown
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#0f1f3a] bg-[#0f1f3a] shadow-xl"
              role="listbox"
            >
              {searchResults.length > 0 ? (
                <ul className="p-1">
                  {searchResults.map((item, index) => (
                    <li key={`${item.fullPath}-${index}`} role="option" aria-selected={item.href === pathname}>
                      <Link
                        href={item.href ?? "#"}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white hover:bg-[#1b365d] transition-colors"
                        onClick={() => { setMenuSearch(""); onClose(); }}
                      >
                        <span className="inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded bg-white/10 text-[9px] font-bold">
                          {getNodeGlyph(item)}
                        </span>
                        <span className="truncate">{item.fullPath}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-sm text-blue-300/80">No menu matches</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation — only this region scrolls */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-white/20">
        <nav className="mb-6 space-y-1">
          {!collapsed && menuSearch.trim() === "" && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-blue-400/60">
              Navigation
            </p>
          )}
          {visibleNodes.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-blue-300/60">
              No menu result found.
            </p>
          ) : (
            visibleNodes.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onClose}
              />
            ))
          )}
        </nav>
      </div>

      {/* Bottom actions */}
      <div className={cn(
        "flex shrink-0 items-center gap-1 border-t border-white/10 pt-2",
        collapsed ? "justify-center" : "justify-between px-2 pb-2"
      )}>
        {!collapsed && (
          <span className="text-[10px] text-blue-300/50">
            © 2026 All Rights Reserved
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-blue-200 hover:bg-[#142847] hover:text-white transition-colors lg:flex"
            onClick={onToggleFullscreen}
            aria-label="Full screen"
            title="Full screen (Ctrl+Shift+F)"
          >
            <IconMaximize className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-blue-200 hover:bg-[#142847] hover:text-white transition-colors lg:flex"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <IconChevronRight className="h-4 w-4" />
            ) : (
              <IconChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "app-sidebar hidden h-full min-h-0 w-full flex-col border-r border-[#0f1f3a] transition-all duration-300 ease-in-out md:flex",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[var(--z-overlay)] bg-slate-900/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex min-h-0 w-72 flex-col border-r border-[#0f1f3a] transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-base font-bold text-white">{PLATFORM_NAME}</span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-blue-200 hover:bg-[#142847] transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
