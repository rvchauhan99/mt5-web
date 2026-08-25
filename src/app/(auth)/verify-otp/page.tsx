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

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) {
      router.replace("/forgot-password");
    }
  }, [email, router]);

  const onSubmit = async () => {
    setError("");
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      await authService.verifyResetOtp(email, otp);
      router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to verify OTP"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <FormContainer title="Verify OTP" description={`We sent an OTP to ${email}`}>
          {error && <div className="mb-4 text-sm text-red-500 font-medium">{error}</div>}
          
          <FormGrid>
            <div className="md:col-span-2">
              <FieldLabel>Enter 6-digit OTP</FieldLabel>
              <Input
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
              />
            </div>
          </FormGrid>
          
          <div className="pt-4 flex flex-col gap-2">
            <Button className="w-full" onClick={onSubmit} disabled={loading || !otp.trim()}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/forgot-password")} disabled={loading}>
              Back
            </Button>
          </div>
        </FormContainer>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
