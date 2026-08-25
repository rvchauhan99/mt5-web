"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PermissionGrid, Permission } from "@/components/sub-admin/PermissionGrid";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/userService";

/** Masters is superadmin-only; never assign `masters.*` via this grid. */
function withoutMastersKeys(keys: string[] | undefined): string[] {
  return (keys ?? []).filter((k) => !k.startsWith("masters."));
}

type SubAdminFormProps = {
  defaultValues?: any;
  onSubmit: (data: any) => void;
  loading?: boolean;
  serverError?: string | null;
  onClearServerError?: () => void;
};

export const SubAdminForm = forwardRef<{ requestSubmit: () => void }, SubAdminFormProps>(
  ({ defaultValues, onSubmit, loading, serverError, onClearServerError }, ref) => {
    const { user } = useAuth();
    
    const [fullName, setFullName] = useState(defaultValues?.fullName || "");
    const [email, setEmail] = useState(defaultValues?.email || "");
    const [username, setUsername] = useState(defaultValues?.username || "");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState(defaultValues?.role || "sub_admin");
    const [status, setStatus] = useState(defaultValues?.status || "active");
    const [permissions, setPermissions] = useState<string[]>(() => withoutMastersKeys(defaultValues?.permissions));

    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

    useEffect(() => {
      userService
        .listPermissions()
        .then((res) => setAllPermissions(res?.data ?? []))
        .catch(() => setAllPermissions([]));
    }, []);

    useEffect(() => {
      if (!defaultValues) return;
      setPermissions(withoutMastersKeys(defaultValues.permissions));
    }, [defaultValues?._id]);

    const handleSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      onClearServerError?.();
      
      const payload: any = {
        fullName,
        email,
        username,
        role,
        permissions,
        status,
      };
      
      if (!defaultValues) {
        payload.password = password;
      }

      onSubmit(payload);
    };

    useImperativeHandle(ref, () => ({
      requestSubmit: handleSubmit,
    }));

    return (
      <form onSubmit={handleSubmit} className="space-y-4 px-1" onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        }
      }}>
        {serverError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {serverError}
          </div>
        )}

        <FormGrid>
          <div className="col-span-1">
            <FieldLabel>Full Name</FieldLabel>
            <Input
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                onClearServerError?.();
              }}
              required
            />
          </div>
          <div className="col-span-1">
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                onClearServerError?.();
              }}
              required
            />
          </div>
          <div className="col-span-1">
            <FieldLabel>Username</FieldLabel>
            <Input
              placeholder="Enter username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                onClearServerError?.();
              }}
              required
            />
          </div>
          
          {!defaultValues && (
            <div className="col-span-1">
              <FieldLabel>Password</FieldLabel>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  onClearServerError?.();
                }}
                required
              />
            </div>
          )}

          <div className="col-span-1">
            <FieldLabel>Role</FieldLabel>
            <Select
              title="role"
              value={role}
              onChange={(e) => {
                const newRole = e.target.value;
                setRole(newRole);
                if (newRole === "admin") {
                  setPermissions(allPermissions.map(p => p.key));
                } else if (!defaultValues || newRole !== defaultValues.role) {
                  setPermissions([]);
                }
              }}
              disabled={user?.role !== "superadmin"}
            >
              {user?.role === "superadmin" && <option value="admin">Admin</option>}
              <option value="sub_admin">Sub Admin</option>
            </Select>
            {user?.role !== "superadmin" && (
              <p className="mt-1 text-sm text-muted-foreground">You can only manage Sub Admins.</p>
            )}
          </div>

          {defaultValues && (
            <div className="col-span-1">
              <FieldLabel>Status</FieldLabel>
              <Select
                title="status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  onClearServerError?.();
                }}
              >
                <option value="active">Active</option>
                <option value="deactive">Inactive</option>
              </Select>
            </div>
          )}

          <div className="col-span-2 mt-2">
            <PermissionGrid
              allPermissions={allPermissions}
              selectedPermissions={permissions}
              onChange={setPermissions}
              disabled={role === "admin"}
            />
            {role === "admin" && (
              <p className="mt-2 text-sm italic text-blue-600">Admins automatically receive all permissions.</p>
            )}
          </div>
        </FormGrid>
      </form>
    );
  }
);
