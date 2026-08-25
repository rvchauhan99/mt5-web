import { Suspense } from "react";
import { ExchangeListClient } from "@/modules/exchange/components/ExchangeListClient";

function ExchangeListFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading exchange list…
    </div>
  );
}

export default function ExchangeListPage() {
  return (
    <Suspense fallback={<ExchangeListFallback />}>
      <ExchangeListClient />
    </Suspense>
  );
}
