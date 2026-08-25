"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "@/services/authService";
import {
  clearSessionStore,
  getSessionUser,
  hydrateSessionStore,
  setAccessToken,
  setSessionUser,
} from "@/services/sessionStore";

type AuthUser = {
  id: string;
  fullName: string;
  role: string;
  permissions?: string[];
  email?: string;
  timezone?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (user: AuthUser, accessToken?: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    hydrateSessionStore();
    const cached = getSessionUser();
    if (cached) {
      setUser(cached);
    }
    authService
      .me()
      .then((res) => {
        if (res?.data) {
          setUser(res.data);
          setSessionUser(res.data);
        }
      })
      .catch(() => {
        clearSessionStore();
        setUser(null);
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login: (userObj: AuthUser, accessToken?: string) => {
        setUser(userObj);
        setSessionUser(userObj);
        if (accessToken) setAccessToken(accessToken);
      },
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          clearSessionStore();
          setUser(null);
        }
      },
    }),
    [isBootstrapping, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
