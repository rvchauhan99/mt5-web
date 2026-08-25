import { Suspense } from "react";
import { BankListClient } from "@/modules/bank/components/BankListClient";

function BankListFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading bank list…
    </div>
  );
}

export default function BankListPage() {
  return (
    <Suspense fallback={<BankListFallback />}>
      <BankListClient />
    </Suspense>
  );
}
