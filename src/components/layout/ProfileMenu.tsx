"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const initial = user?.fullName?.slice(0, 2).toUpperCase() ?? "AD";
  const name = user?.fullName ?? "Admin";
  const role = user?.role ?? "admin";

  return (
    <div className="relative">
      <button
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-card p-2 hover:bg-sidebar-hover"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
          {initial}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold leading-4">{name}</p>
          <p className="text-xs capitalize text-text-secondary">{role}</p>
        </div>
      </button>
      {open ? (
        <div className="absolute bottom-12 left-0 w-full rounded-xl border border-border bg-surface-card p-2 shadow-lg">
          <Button variant="ghost" className="w-full justify-start">
            My Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            Change Password
          </Button>
          <Button variant="ghost" className="w-full justify-start text-danger" onClick={logout}>
            Logout
          </Button>
        </div>
      ) : null}
    </div>
  );
}
