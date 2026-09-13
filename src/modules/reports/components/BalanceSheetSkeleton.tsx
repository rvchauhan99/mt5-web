interface BalanceSheetSkeletonProps { showCharts?: boolean; }

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export function BalanceSheetSkeleton({ showCharts = true }: BalanceSheetSkeletonProps) {
  return (
    <div className="min-h-screen space-y-5 bg-slate-50 p-4 md:p-6" aria-busy="true" aria-label="Loading balance sheet">
      <div className="space-y-2"><Block className="h-7 w-64" /><Block className="h-4 w-96" /></div>
      <Block className="h-20 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <Block key={n} className="h-28" />)}</div>
      <Block className="h-14 w-full" />
      {showCharts && <div className="grid gap-4 lg:grid-cols-3">{[1, 2, 3].map((n) => <Block key={n} className="h-72" />)}</div>}
      <div className="grid gap-4 xl:grid-cols-2">{[1, 2].map((n) => <div key={n} className="rounded-xl border border-slate-200 bg-white p-4"><Block className="mb-4 h-6 w-40" /><div className="space-y-3">{Array.from({ length: 8 }, (_, i) => <Block key={i} className="h-6 w-full" />)}</div></div>)}</div>
    </div>
  );
}