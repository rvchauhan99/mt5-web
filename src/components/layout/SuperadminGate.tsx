"use client";

import { PropsWithChildren, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Renders children only for active superadmin sessions; others are redirected to the dashboard.
 */
export function SuperadminGate({ children }: PropsWithChildren) {
  const { user, isBootstrapping } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isBootstrapping) return;
    if (user?.role !== "superadmin") {
      router.replace("/dashboard");
    }
  }, [isBootstrapping, user?.role, router]);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">Loading…</div>
    );
  }
  if (user?.role !== "superadmin") {
    return null;
  }
  return <>{children}</>;
}
