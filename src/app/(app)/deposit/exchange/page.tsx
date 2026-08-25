import { Suspense } from "react";
import { DepositExchangeClient } from "@/modules/deposit/components/DepositExchangeClient";

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading…
    </div>
  );
}

export default function DepositExchangePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <DepositExchangeClient />
    </Suspense>
  );
}
