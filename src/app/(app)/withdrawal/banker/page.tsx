import { Suspense } from "react";
import { WithdrawalBankerClient } from "@/modules/withdrawal/components/WithdrawalBankerClient";

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading…
    </div>
  );
}

export default function WithdrawalBankerPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <WithdrawalBankerClient />
    </Suspense>
  );
}
