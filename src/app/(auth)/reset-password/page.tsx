"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/authService";
import { getApiErrorMessage } from "@/lib/apiError";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!email || !otp) {
      router.replace("/forgot-password");
    }
  }, [email, otp, router]);

  const onSubmit = async () => {
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        email,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess("Password reset successfully.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <FormContainer title="Reset Password" description="Enter your new password">
          {error && <div className="mb-4 text-sm text-red-500 font-medium">{error}</div>}
          {success && <div className="mb-4 text-sm text-green-600 font-medium">{success}</div>}
          
          <FormGrid>
            <div className="md:col-span-2">
              <FieldLabel>New Password</FieldLabel>
              <Input
                type="password"
                placeholder="******"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading || !!success}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Confirm Password</FieldLabel>
              <Input
                type="password"
                placeholder="******"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || !!success}
              />
            </div>
          </FormGrid>
          
          <div className="pt-4 flex flex-col gap-2">
            <Button className="w-full" onClick={onSubmit} disabled={loading || !!success || !newPassword || !confirmPassword}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </FormContainer>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
