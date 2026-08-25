"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/authService";
import { getApiErrorMessage } from "@/lib/apiError";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async () => {
    setError("");
    setSuccess("");
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendPasswordResetOtp(email);
      setSuccess(res.message || "OTP sent successfully. Check your email.");
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to send reset email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <FormContainer title="Forgot Password" description="Enter your email to receive an OTP">
          {error && <div className="mb-4 text-sm text-red-500 font-medium">{error}</div>}
          {success && <div className="mb-4 text-sm text-green-600 font-medium">{success}</div>}
          
          <FormGrid>
            <div className="md:col-span-2">
              <FieldLabel>Email Address</FieldLabel>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || !!success}
              />
            </div>
          </FormGrid>
          
          <div className="pt-4 flex flex-col gap-2">
            <Button className="w-full" onClick={onSubmit} disabled={loading || !!success || !email.trim()}>
              {loading ? "Sending..." : "Send Reset Code"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/login")} disabled={loading || !!success}>
              Back to Login
            </Button>
          </div>
        </FormContainer>
      </div>
    </div>
  );
}
