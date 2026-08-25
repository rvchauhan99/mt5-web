import { apiClient } from "./apiClient";

export type CreateUserPayload = {
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: "admin" | "sub_admin";
  permissions: string[];
  timezone?: string;
};

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, "password">> & {
  status?: string;
  timezone?: string;
};

export const userService = {
  create: async (payload: CreateUserPayload) => {
    const res = await apiClient.post("/users", payload);
    return res.data;
  },
  list: async (params?: Record<string, any>) => {
    const res = await apiClient.get("/users", { params });
    return res.data;
  },
  exportUsers: async (params?: Record<string, any>) => {
    const res = await apiClient.get("/users/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  },
  update: async (id: string, payload: UpdateUserPayload) => {
    const res = await apiClient.put(`/users/${id}`, payload);
    return res.data;
  },
  deleteUser: async (id: string) => {
    const res = await apiClient.delete(`/users/${id}`);
    return res.data;
  },
  setUserPassword: async (id: string, payload: { new_password: string }) => {
    const res = await apiClient.post(`/users/${id}/reset-password`, payload);
    return res.data;
  },
  listPermissions: async () => {
    const res = await apiClient.get("/users/permissions");
    return res.data;
  },
};
