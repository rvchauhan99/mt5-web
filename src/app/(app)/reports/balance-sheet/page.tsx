import { Suspense } from "react";
import { BalanceSheetClient } from "@/modules/reports/components/BalanceSheetClient";
import { BalanceSheetSkeleton } from "@/modules/reports/components/BalanceSheetSkeleton";

export default function BalanceSheetPage() {
  return (
    <Suspense
      fallback={<BalanceSheetSkeleton />}
    >
      <BalanceSheetClient />
    </Suspense>
  );
}
