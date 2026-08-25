"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { AutocompleteField, AutocompleteOption } from "@/components/common/AutocompleteField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PermissionGrid, Permission } from "@/components/sub-admin/PermissionGrid";
import { userService } from "@/services/userService";
import { getApiErrorMessage } from "@/lib/apiError";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_TIMEZONE, timezoneOptionsWithValue } from "@/lib/timezoneOptions";

type UserRow = {
  _id: string;
  fullName: string;
  email: string;
  username: string;
  role: string;
  status: "active" | "deactive";
  permissions?: string[];
  timezone?: string;
};

type EditableRole = "superadmin" | "admin" | "sub_admin";

export default function SubAdminEditPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [status, setStatus] = useState<"active" | "deactive">("active");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [savingFinalUpdate, setSavingFinalUpdate] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [updateMessage, setUpdateMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const actorRole = (user?.role ?? "") as EditableRole | "";
  const allowedTargetRoles = useMemo<EditableRole[]>(() => {
    if (actorRole === "superadmin") return ["admin", "sub_admin"];
    if (actorRole === "admin") return ["sub_admin"];
    return [];
  }, [actorRole]);

  const isActorAllowed = allowedTargetRoles.length > 0;

  const filteredUsers = useMemo(
    () => users.filter((u) => allowedTargetRoles.includes(u.role as EditableRole)),
    [users, allowedTargetRoles]
  );

  const selectedUser = useMemo(
    () => filteredUsers.find((u) => u._id === selectedUserId) ?? null,
    [filteredUsers, selectedUserId]
  );

  const isSelectedTargetAllowed = Boolean(selectedUser && allowedTargetRoles.includes(selectedUser.role as EditableRole));
  const canMutateSelected = isActorAllowed && isSelectedTargetAllowed;

  const hydrateFromSelectedUser = useCallback((row: UserRow | null) => {
    if (!row) {
      setFullName("");
      setEmail("");
      setUsername("");
      setTimezone(DEFAULT_TIMEZONE);
      setStatus("active");
      setPermissions([]);
      return;
    }
    setFullName(row.fullName ?? "");
    setEmail(row.email ?? "");
    setUsername(row.username ?? "");
    setTimezone(row.timezone?.trim() || DEFAULT_TIMEZONE);
    setStatus((row.status as "active" | "deactive") ?? "active");
    setPermissions((row.permissions ?? []).filter((k) => !k.startsWith("masters.")));
  }, []);

  const loadUserOptions = useCallback(
    async (query: string): Promise<AutocompleteOption[]> => {
      if (!isActorAllowed) return [];
      setLoadingUsers(true);
      try {
        const response = await userService.list({
          q: query || undefined,
          page: 1,
          limit: 20,
          sortBy: "fullName",
          sortOrder: "asc",
        });
        const list = (response?.data ?? []) as UserRow[];
        const allowedRows = list.filter((row) => allowedTargetRoles.includes(row.role as EditableRole));
        setUsers((prev) => {
          const map = new Map(prev.map((row) => [row._id, row]));
          for (const row of allowedRows) map.set(row._id, row);
          return Array.from(map.values());
        });
        return allowedRows.map((row) => ({
          value: row._id,
          label: `${row.fullName} (${row.username}) - ${row.role === "sub_admin" ? "Sub Admin" : "Admin"}`,
        }));
      } catch (error: unknown) {
        setUpdateMessage(getApiErrorMessage(error, "Failed to load users"));
        return [];
      } finally {
        setLoadingUsers(false);
      }
    },
    [allowedTargetRoles, isActorAllowed]
  );

  useEffect(() => {
    setLoadingPermissions(true);
    userService
      .listPermissions()
      .then((res) => setAllPermissions(res?.data ?? []))
      .catch(() => setAllPermissions([]))
      .finally(() => setLoadingPermissions(false));
  }, []);

  useEffect(() => {
    hydrateFromSelectedUser(selectedUser);
  }, [selectedUser, hydrateFromSelectedUser]);

  const clearMessages = () => {
    setUpdateMessage("");
    setPasswordMessage("");
  };

  const ensureSelectedUser = () => {
    if (!isActorAllowed) {
      setUpdateMessage("You are not allowed to edit users.");
      return false;
    }
    if (!selectedUserId || !isSelectedTargetAllowed) {
      setUpdateMessage("Please select an allowed user first.");
      return false;
    }
    return true;
  };

  const handleFinalUpdate = async () => {
    clearMessages();
    if (!ensureSelectedUser()) return;
    setSavingFinalUpdate(true);
    try {
      await userService.update(selectedUserId, { fullName, email, username, status, permissions, timezone });
      setUpdateMessage("User details updated successfully.");
      setUsers((prev) =>
        prev.map((row) =>
          row._id === selectedUserId ? { ...row, fullName, email, username, status, permissions, timezone } : row
        )
      );
    } catch (error: unknown) {
      setUpdateMessage(getApiErrorMessage(error, "Failed to update user details"));
    } finally {
      setSavingFinalUpdate(false);
    }
  };

  const handleResetPassword = async () => {
    clearMessages();
    if (!ensureSelectedUser()) return;
    if (newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage("New password and re-enter password must match.");
      return;
    }
    setSavingPassword(true);
    try {
      await userService.setUserPassword(selectedUserId, { new_password: newPassword });
      setPasswordMessage("Password changed successfully.");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: unknown) {
      setPasswordMessage(getApiErrorMessage(error, "Failed to change password"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ListingPageContainer title="Edit Sub Admin" fullWidth>
        <FormContainer title="User Management" description="Update profile, password, status and access permissions.">
          <div className="space-y-5">
            {!isActorAllowed && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                You do not have permission to edit users. Only Super Admin and Admin can perform edits.
              </p>
            )}
            <FormGrid gap="sm">
              <div className="col-span-2">
                <FieldLabel>Select User</FieldLabel>
                <AutocompleteField
                  value={selectedUserId}
                  onChange={(nextValue) => {
                    clearMessages();
                    setSelectedUserId(nextValue);
                  }}
                  loadOptions={loadUserOptions}
                  disabled={!isActorAllowed}
                  placeholder={actorRole === "superadmin" ? "Search admin or sub admin" : "Search sub admin"}
                  emptyText={loadingUsers ? "Loading users..." : "No editable users found"}
                />
              </div>
            </FormGrid>

            <div className="rounded-md border border-[var(--border)] p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[#1b365d]">Profile Update</h3>
              <FormGrid gap="sm">
                <div className="col-span-1">
                  <FieldLabel>Full Name</FieldLabel>
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter full name" />
                </div>
                <div className="col-span-1">
                  <FieldLabel>Email</FieldLabel>
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter email" type="email" />
                </div>
                <div className="col-span-2">
                  <FieldLabel>Username</FieldLabel>
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter username" />
                </div>
                <div className="col-span-2">
                  <FieldLabel>Timezone</FieldLabel>
                  <Select
                    title="timezone"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    disabled={!canMutateSelected}
                  >
                    {timezoneOptionsWithValue(timezone).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </FormGrid>
            </div>

            <div className="rounded-md border border-[var(--border)] p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[#1b365d]">Status Management</h3>
              <FormGrid gap="sm">
                <div className="col-span-2">
                  <FieldLabel>Status</FieldLabel>
                  <Select title="status" value={status} onChange={(event) => setStatus(event.target.value as "active" | "deactive")}>
                    <option value="active">Active</option>
                    <option value="deactive">Inactive</option>
                  </Select>
                </div>
              </FormGrid>
            </div>

            <div className="rounded-md border border-[var(--border)] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#1b365d]">Permission Management</h3>
              <PermissionGrid
                allPermissions={allPermissions}
                selectedPermissions={permissions}
                onChange={setPermissions}
                disabled={loadingPermissions || !canMutateSelected}
                density="compact"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white p-4">
              <p className="text-sm text-muted-foreground">{updateMessage}</p>
              <Button onClick={handleFinalUpdate} disabled={!canMutateSelected || loadingPermissions || savingFinalUpdate}>
                {savingFinalUpdate ? "Updating..." : "Final Update"}
              </Button>
            </div>

            <div className="rounded-md border border-[var(--border)] p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[#1b365d]">Password Management</h3>
              <FormGrid gap="sm">
                <div className="col-span-1">
                  <FieldLabel>New Password</FieldLabel>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="col-span-1">
                  <FieldLabel>Re-enter New Password</FieldLabel>
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </FormGrid>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{passwordMessage}</p>
                <Button onClick={handleResetPassword} disabled={!canMutateSelected || savingPassword}>
                  {savingPassword ? "Saving..." : "Change Password"}
                </Button>
              </div>
            </div>
          </div>
        </FormContainer>
      </ListingPageContainer>
    </div>
  );
}
