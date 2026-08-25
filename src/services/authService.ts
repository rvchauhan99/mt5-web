import { apiClient } from "./apiClient";

type PasswordPayload = {
  current_password?: string;
  new_password: string;
  confirm_password: string;
  email?: string;
  otp?: string;
};

export const authService = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post("/auth/login", { username: email, password });
    return res.data;
  },
  verify2Fa: async (tempToken: string, code: string) => {
    const res = await apiClient.post("/auth/verify-2fa", { tempToken, code });
    return res.data;
  },
  sendPasswordResetOtp: async (email: string) => {
    const res = await apiClient.post("/auth/forgot-password", { email });
    return res.data;
  },
  verifyResetOtp: async (email: string, otp: string) => {
    const res = await apiClient.post("/auth/verify-reset-otp", { email, otp });
    return res.data;
  },
  resetPassword: async (data: PasswordPayload) => {
    const res = await apiClient.post("/auth/reset-password", data);
    return res.data;
  },
  changePassword: async (data: PasswordPayload) => {
    const res = await apiClient.post("/auth/change-password", data);
    return res.data;
  },
  generate2Fa: async () => {
    const res = await apiClient.post("/auth/2fa/generate");
    return res.data;
  },
  enable2Fa: async (code: string) => {
    const res = await apiClient.post("/auth/2fa/enable", { code });
    return res.data;
  },
  disable2Fa: async () => {
    const res = await apiClient.post("/auth/2fa/disable");
    return res.data;
  },
  me: async () => {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post("/auth/logout");
    return res.data;
  },
};
