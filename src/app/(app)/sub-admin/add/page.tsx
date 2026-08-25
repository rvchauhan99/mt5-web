"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/lib/apiError";
import { userService } from "@/services/userService";
import { PermissionGrid, Permission } from "@/components/sub-admin/PermissionGrid";
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from "@/lib/timezoneOptions";

export default function SubAdminAddPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sub_admin");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    userService
      .listPermissions()
      .then((res) => setAllPermissions(res?.data ?? []))
      .catch(() => setAllPermissions([]));
  }, []);

  const submit = async () => {
    setLoading(true);
    setMessage("");
    try {
      await userService.create({
        fullName,
        email,
        username,
        password,
        role: role as "admin" | "sub_admin",
        permissions,
        timezone,
      });
      setMessage("Administrative user created successfully.");
      setFullName("");
      setEmail("");
      setUsername("");
      setPassword("");
      setTimezone(DEFAULT_TIMEZONE);
      setPermissions([]);
    } catch (error: unknown) {
      setMessage(getApiErrorMessage(error, "Failed to create user"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Add Administrative User</h1>
        <p className="text-muted-foreground">Create a new admin or sub-admin account.</p>
      </div>

      <FormContainer title="User Details">
        <FormGrid>
          <div className="col-span-1">
            <FieldLabel>Full Name</FieldLabel>
            <Input placeholder="Enter full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="col-span-1">
            <FieldLabel>Email</FieldLabel>
            <Input type="email" placeholder="Enter email address" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="col-span-1">
            <FieldLabel>Username</FieldLabel>
            <Input placeholder="Enter username" value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className="col-span-1">
            <FieldLabel>Password</FieldLabel>
            <Input type="password" placeholder="Enter temporary password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div className="col-span-2">
            <FieldLabel>Role</FieldLabel>
            <Select
              title="role"
              value={role}
              onChange={(e) => {
                const newRole = e.target.value;
                setRole(newRole);
                if (newRole === "admin") {
                  setPermissions(allPermissions.map(p => p.key));
                } else {
                  setPermissions([]);
                }
              }}
              disabled={user?.role !== "superadmin"}
            >
              {user?.role === "superadmin" && <option value="admin">Admin</option>}
              <option value="sub_admin">Sub Admin</option>
            </Select>
            {user?.role !== "superadmin" && (
              <p className="mt-1 text-sm text-muted-foreground">You can only create Sub Admins.</p>
            )}
          </div>
          <div className="col-span-2">
            <FieldLabel>Timezone</FieldLabel>
            <Select title="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          
          <div className="col-span-2 mt-2">
            <PermissionGrid
              allPermissions={allPermissions}
              selectedPermissions={permissions}
              onChange={setPermissions}
              disabled={role === "admin"}
              density="compact"
            />
            {role === "admin" && (
              <p className="mt-1.5 text-sm italic text-blue-600">Admins automatically receive all permissions.</p>
            )}
          </div>
        </FormGrid>

        <div className="pt-3">
          <Button
            onClick={submit}
            disabled={loading || !fullName || !email || !username || !password}
          >
            {loading ? "Creating..." : "Create User"}
          </Button>
          {message ? <p className="mt-2 text-sm">{message}</p> : null}
        </div>
      </FormContainer>
    </div>
  );
}
