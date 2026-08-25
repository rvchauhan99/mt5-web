import { Suspense } from "react";
import { ExpenseAuditClient } from "@/modules/expense/components/ExpenseAuditClient";

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">Loading…</div>
  );
}

export default function ExpenseAuditPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ExpenseAuditClient />
    </Suspense>
  );
}
