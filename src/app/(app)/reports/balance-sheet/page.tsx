import { Suspense } from "react";
import { BalanceSheetClient } from "@/modules/reports/components/BalanceSheetClient";

export default function BalanceSheetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-6 text-sm text-slate-500">
          Loading balance sheet…
        </div>
      }
    >
      <BalanceSheetClient />
    </Suspense>
  );
}
