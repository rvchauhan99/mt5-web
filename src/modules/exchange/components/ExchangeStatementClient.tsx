"use client";

import { useCallback, useState } from "react";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendar,
  IconPrinter,
  IconFilter,
  IconInfoCircle,
} from "@tabler/icons-react";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/cn";
import { DATE_PRESETS } from "@/modules/dashboard/components/DashboardFilterBar";
import { getExchangeStatement } from "@/services/exchangeService";
import { listExchangeLookupOptions, listPlayerLookupOptions } from "@/services/lookupService";
import type { ExchangeStatementEntryType, ExchangeStatementResponse } from "@/types/exchange";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { formatScaledMoney } from "@/lib/formatMoney";
import { formatDateTimeForUser } from "@/lib/userTimezone";

export function ExchangeStatementClient() {
  const { platformCurrency } = useFormatMoney();
  const formatAmount = (value: number) => formatScaledMoney(value, platformCurrency, "-");
  const [exchangeId, setExchangeId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entryType, setEntryType] = useState<ExchangeStatementEntryType>("all");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState<ExchangeStatementResponse | null>(null);

  const loadExchangeOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = await listExchangeLookupOptions({ q: query || undefined, limit: 40 });
      return rows.map((item) => ({
        value: item.id,
        label: `${item.name} - ${item.provider}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadPlayerOptions = useCallback(
    async (query: string): Promise<AutocompleteOption[]> => {
      if (!exchangeId.trim()) return [];
      try {
        const rows = await listPlayerLookupOptions({ q: query || undefined, limit: 40 });
        return rows
          .filter((row) => (row.exchangeId ?? "") === exchangeId.trim())
          .map((row) => ({ value: row.id, label: `${row.playerId} (${row.phone})` }));
      } catch {
        return [];
      }
    },
    [exchangeId],
  );

  const handlePreset = (preset: (typeof DATE_PRESETS)[0]) => {
    const dates = preset.fn();
    setFromDate(dates.date_from);
    setToDate(dates.date_to);
    setActivePreset(preset.label);
  };

  const loadStatement = async () => {
    if (!exchangeId.trim()) {
      setError("Please select an exchange first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getExchangeStatement(exchangeId.trim(), {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        playerId: playerId || undefined,
        entryType,
      });
      setStatement(data);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to load exchange statement"));
      setStatement(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-container, #print-container * {
            visibility: visible;
          }
          #print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `,
        }}
      />
      <div className="space-y-4 pb-8 max-w-[1400px] mx-auto no-print">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Exchange Statement</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Deposit entries are debits and withdrawal entries are credits from exchange perspective.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[260px] flex-1 space-y-1.5">
            <FieldLabel>
              Exchange <span className="text-red-500">*</span>
            </FieldLabel>
            <AutocompleteField
              value={exchangeId}
              onChange={(value) => {
                setExchangeId(value);
                setPlayerId("");
                setStatement(null);
              }}
              loadOptions={loadExchangeOptions}
              placeholder="Search exchange..."
            />
          </div>
          <div className="min-w-[260px] flex-1 space-y-1.5">
            <FieldLabel>Player (Optional)</FieldLabel>
            <AutocompleteField
              value={playerId}
              onChange={(value) => {
                setPlayerId(value);
                setStatement(null);
              }}
              loadOptions={loadPlayerOptions}
              autoSelectSingleOption
              placeholder={exchangeId ? "Search player..." : "Select exchange first"}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1.5 min-w-max">
            <IconCalendar className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 mr-2">Range:</span>
            {DATE_PRESETS.filter((preset) => !["Last 6M", "This Year"].includes(preset.label)).map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded-full border transition-all",
                  activePreset === preset.label
                    ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] font-semibold shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-[var(--brand-primary)]/50",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setActivePreset(null);
              }}
              className="text-xs h-8 px-2 w-[130px] bg-white border-slate-200"
            />
            <span className="text-[10px] text-slate-400">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setActivePreset(null);
              }}
              className="text-xs h-8 px-2 w-[130px] bg-white border-slate-200"
            />
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-1 flex-1">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 mr-2">Type:</span>
            {(["all", "deposit", "withdrawal", "topup"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setEntryType(type)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-md transition-all capitalize font-medium",
                  entryType === type ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-100",
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <Button onClick={loadStatement} disabled={loading} className="h-8 text-xs font-semibold px-4 ml-auto gap-2">
            <IconFilter className="w-3.5 h-3.5" />
            {loading ? "Generating..." : "Generate Statement"}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm flex items-center gap-2">
            <IconInfoCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
      </div>

      {statement && (
        <div
          id="print-container"
          className="max-w-[1400px] mx-auto bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden print:border-none print:shadow-none print:rounded-none"
        >
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{statement.exchange.name}</h2>
              <div className="no-print">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-xs gap-2"
                  startIcon={<IconPrinter size={14} />}
                  onClick={handlePrint}
                >
                  Print PDF
                </Button>
              </div>
            </div>
            <p className="text-slate-600 font-medium text-lg mt-0.5">{statement.exchange.provider}</p>
            <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
              <span>
                Period:{" "}
                <strong className="text-slate-700">
                  {fromDate ? new Date(fromDate).toLocaleDateString("en-IN") : "Start"}
                </strong>{" "}
                to{" "}
                <strong className="text-slate-700">{toDate ? new Date(toDate).toLocaleDateString("en-IN") : "Today"}</strong>
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>
                Generated:{" "}
                {new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>
                Current Balance:{" "}
                <strong className="text-slate-700">
                  {formatAmount(statement.exchange.currentBalance ?? statement.periodClosingBalance)}
                </strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-200 bg-white">
            <div className="p-4">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-400 mb-1 block">
                Opening Balance
              </span>
              <span className="text-xl font-bold text-slate-800">{formatAmount(statement.periodOpeningBalance)}</span>
            </div>
            <div className="p-4">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-emerald-600/70 mb-1 flex items-center gap-1">
                <IconArrowUpRight className="w-3 h-3" /> Total Credits
              </span>
              <span className="text-xl font-bold text-emerald-700">{formatAmount(statement.totalCredits)}</span>
              {statement.totalTopUpCredits > 0 ? (
                <div className="text-[10px] text-emerald-600 mt-1">
                  Top Up Credits: {formatAmount(statement.totalTopUpCredits)}
                </div>
              ) : null}
            </div>
            <div className="p-4">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-rose-600/70 mb-1 flex items-center gap-1">
                <IconArrowDownRight className="w-3 h-3" /> Total Debits
              </span>
              <span className="text-xl font-bold text-rose-700">{formatAmount(statement.totalDebits)}</span>
            </div>
            <div className="p-4 bg-slate-50/50">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-600 mb-1 block">
                Closing Balance
              </span>
              <span className="text-2xl font-bold text-slate-900">{formatAmount(statement.periodClosingBalance)}</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs text-left align-top">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-[160px]">Date & Time</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 w-[180px]">Player / Ref</th>
                  <th className="py-3 px-4 text-right w-[120px]">Credit (CR)</th>
                  <th className="py-3 px-4 text-right w-[120px]">Debit (DR)</th>
                  <th className="py-3 px-4 text-right w-[140px] bg-slate-100/50 border-l border-slate-200">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statement.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No transactions found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  statement.rows.map((row, index) => (
                    <tr key={`${row.kind}-${row.refId}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {formatDateTimeForUser(row.at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{row.label}</div>
                        {row.utr ? <div className="text-[10px] text-slate-400 font-mono mt-0.5">UTR: {row.utr}</div> : null}
                        {row.remark ? <div className="text-[10px] text-slate-500 mt-0.5">Remark: {row.remark}</div> : null}
                        {row.bonusMemo && row.bonusMemo > 0 ? (
                          <div className="mt-1 text-[10px] text-amber-600 italic bg-amber-50 px-1.5 py-0.5 rounded inline-block">
                            Memo: {formatAmount(row.bonusMemo)}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {row.playerId || row.createdByName || "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {row.direction === "credit" ? (
                          <span className="font-semibold text-emerald-600">{formatAmount(row.amount)}</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {row.direction === "debit" ? (
                          <span className="font-semibold text-rose-600">{formatAmount(row.amount)}</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800 bg-slate-50/30 border-l border-slate-100">
                        {formatAmount(row.balanceAfter)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
