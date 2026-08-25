import { Suspense } from "react";
import { DepositFinalListClient } from "@/modules/deposit/components/DepositFinalListClient";

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading…
    </div>
  );
}

export default function DepositFinalListPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <DepositFinalListClient />
    </Suspense>
  );
}
