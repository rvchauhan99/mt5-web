import { Suspense } from "react";
import { WithdrawalFinalListClient } from "@/modules/withdrawal/components/WithdrawalFinalListClient";

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading…
    </div>
  );
}

export default function WithdrawalFinalListPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <WithdrawalFinalListClient />
    </Suspense>
  );
}
