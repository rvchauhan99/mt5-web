import { Suspense } from "react";
import { WithdrawalExchangeClient } from "@/modules/withdrawal/components/WithdrawalExchangeClient";

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading…
    </div>
  );
}

export default function WithdrawalExchangePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <WithdrawalExchangeClient />
    </Suspense>
  );
}
