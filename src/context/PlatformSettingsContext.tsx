"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { settingsService, type PlatformSettings } from "@/services/settingsService";
import { useAuth } from "@/context/AuthContext";

type PlatformSettingsContextValue = {
  settings: PlatformSettings | null;
  isLoading: boolean;
  platformCurrency: string | null;
  isCurrencyLocked: boolean;
  refresh: () => Promise<void>;
  setCurrency: (currency: string) => Promise<PlatformSettings>;
};

const PlatformSettingsContext = createContext<PlatformSettingsContextValue | null>(null);

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSettings(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await settingsService.getPlatform();
      setSettings(data);
    } catch {
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setCurrency = useCallback(async (currency: string) => {
    const data = await settingsService.setPlatformCurrency(currency);
    setSettings(data);
    return data;
  }, []);

  const value = useMemo<PlatformSettingsContextValue>(
    () => ({
      settings,
      isLoading,
      platformCurrency: settings?.platformCurrency ?? null,
      isCurrencyLocked: Boolean(settings?.isLocked),
      refresh,
      setCurrency,
    }),
    [settings, isLoading, refresh, setCurrency],
  );

  return <PlatformSettingsContext.Provider value={value}>{children}</PlatformSettingsContext.Provider>;
}

export function usePlatformSettings() {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) {
    throw new Error("usePlatformSettings must be used within PlatformSettingsProvider");
  }
  return ctx;
}

/** Safe hook for optional use outside provider (returns null currency). */
export function usePlatformCurrencyOrNull(): string | null {
  const ctx = useContext(PlatformSettingsContext);
  return ctx?.platformCurrency ?? null;
}
