"use client";

import { IconBuildingStore, IconInfoCircle } from "@tabler/icons-react";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import type { DashboardSummary } from "./DashboardKPIs";

type ExchangeRow = NonNullable<DashboardSummary["exchangesBreakdown"]>[number];

type Props = {
  exchangesBreakdown: DashboardSummary["exchangesBreakdown"];
  loading?: boolean;
  playerScoped?: boolean;
};

function ClosingCardSkeleton() {
  return <div className="h-24 min-w-[220px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasLedgerBalance(row: ExchangeRow): boolean {
  return isFiniteNumber(row.periodOpeningBalance) || isFiniteNumber(row.periodClosingBalance);
}

export function DashboardExchangeClosingStrip({ exchangesBreakdown, loading = false, playerScoped = false }: Props) {
  const { formatMoney } = useFormatMoney();
  const fmt = (value: number) => formatMoney(value, { includeSign: true });

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-64 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((key) => (
            <ClosingCardSkeleton key={key} />
          ))}
        </div>
      </div>
    );
  }

  const rows = (exchangesBreakdown ?? []).filter(hasLedgerBalance);
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <IconBuildingStore className="h-5 w-5 text-slate-700" />
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Exchange Wise Closing Balance</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {rows.map((row) => (
          <article
            key={row.exchangeId}
            className="min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">{row.name}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {fmt(row.periodClosingBalance ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Opening: <span className="font-medium text-slate-700">{fmt(row.periodOpeningBalance ?? 0)}</span>
            </p>
          </article>
        ))}
      </div>

      {playerScoped ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <IconInfoCircle className="h-3.5 w-3.5" />
          Closing balances remain exchange-level even when a player filter is applied.
        </p>
      ) : null}
    </section>
  );
}
