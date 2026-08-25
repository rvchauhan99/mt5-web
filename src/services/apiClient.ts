import axios from "axios";
import { AxiosRequestConfig } from "axios";
import { resolveUserTimeZone } from "@/lib/userTimezone";
import { clearSessionStore, getAccessToken, setAccessToken } from "./sessionStore";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1",
  timeout: 12000,
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

function isAuthRoute(url?: string) {
  return Boolean(url?.includes("/auth/"));
}

async function getFreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh", {})
      .then((refreshResponse) => {
        const nextToken = refreshResponse?.data?.data?.accessToken as string | undefined;
        if (!nextToken) throw new Error("Missing refreshed access token");
        setAccessToken(nextToken);
        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-User-Timezone"] = resolveUserTimeZone();
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url;
    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    // Never try to refresh auth endpoints themselves; avoids recursive 401 loops.
    if (isAuthRoute(requestUrl)) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    try {
      const nextToken = await getFreshAccessToken();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearSessionStore();
      return Promise.reject(refreshError);
    }
  },
);
