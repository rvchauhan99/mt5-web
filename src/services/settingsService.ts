import { apiClient } from "./apiClient";

export type PlatformSettings = {
  platformCurrency: string | null;
  currencyLockedAt: string | null;
  currencyLockedBy: string | null;
  isLocked: boolean;
  supportedCurrencies: string[];
};

export const settingsService = {
  getPlatform: async (): Promise<PlatformSettings> => {
    const res = await apiClient.get("/settings/platform");
    return res.data.data as PlatformSettings;
  },
  setPlatformCurrency: async (currency: string): Promise<PlatformSettings> => {
    const res = await apiClient.put("/settings/platform/currency", { currency });
    return res.data.data as PlatformSettings;
  },
};
