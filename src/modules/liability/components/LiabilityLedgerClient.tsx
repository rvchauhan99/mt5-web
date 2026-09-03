"use client";

import { useCallback, useState, useRef } from "react";
import { 
  IconFilter, 
  IconCalendar, 
  IconArrowUpRight, 
  IconArrowDownRight, 
  IconInfoCircle,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText
} from "@tabler/icons-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from "@/components/ui/shadcn/dropdown-menu";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { exportLiabilityLedger, getLiabilityPersonLedger, listLiabilityPersonsNormalized } from "@/services/liabilityService";
import { useExport } from "@/hooks/useExport";
import type { LiabilityBalanceSide, LiabilityLedgerResponse, LiabilityViewMode } from "@/types/liability";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  formatLiabilityMoneyAbs,
  liabilitySideAmountClass,
  liabilitySideBadgeClass,
  liabilitySideFromSigned,
} from "@/lib/liabilityDisplay";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { FxCurrencyRateCell, FxOperatedAmountCell } from "@/components/common/FxDisplayCells";
import { DATE_PRESETS } from "@/modules/dashboard/components/DashboardFilterBar";
import { cn } from "@/lib/cn";
import { BRANDING } from "@/lib/constants/branding";
import { formatDateTimeForUser, formatYyyyMmDdInTimeZone, resolveUserTimeZone } from "@/lib/userTimezone";

function todayYmdInUserTz(): string {
  return formatYyyyMmDdInTimeZone(new Date(), resolveUserTimeZone());
}

export function LiabilityLedgerClient() {
  const { platformCurrency } = useFormatMoney();
  const fmtLiability = (value: number) => formatLiabilityMoneyAbs(value, platformCurrency);
  const [personId, setPersonId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayYmdInUserTz());
  const [activePreset, setActivePreset] = useState<string | null>(null);
  /** Default platform perspective; Person (master) aligns with stored `closingBalance` and rollups for full history. */
  const [viewMode, setViewMode] = useState<LiabilityViewMode>("platform");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LiabilityLedgerResponse | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const loadPersonOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const res = await listLiabilityPersonsNormalized({ page: 1, limit: 30, q: query, sortBy: "name", sortOrder: "asc" });
      return res.data.map((p) => ({ value: p.id, label: p.name }));
    } catch {
      return [];
    }
  }, []);

  const handlePreset = (preset: typeof DATE_PRESETS[0]) => {
    const dates = preset.fn();
    setFromDate(dates.date_from);
    setToDate(dates.date_to);
    setActivePreset(preset.label);
  };

  const onLoad = async () => {
    if (!personId.trim()) {
      setError("Please select a person first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getLiabilityPersonLedger(personId.trim(), {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        viewMode,
      });
      setLedger(data);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to load ledger"));
      setLedger(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const { exporting, handleExport } = useExport((params) => exportLiabilityLedger(personId, params), {
    fileName: `liability-ledger-${personId}-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    if (!personId) return;
    handleExport({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      viewMode,
    });
  }, [handleExport, personId, fromDate, toDate, viewMode]);

  const totalCredits = ledger?.rows.reduce((acc, r) => acc + r.credit, 0) ?? 0;
  const totalDebits = ledger?.rows.reduce((acc, r) => acc + r.debit, 0) ?? 0;
  const runningDeltaForFirstRow = ledger?.rows[0]
    ? (ledger.viewMode === "person"
      ? ledger.rows[0].credit - ledger.rows[0].debit
      : ledger.rows[0].debit - ledger.rows[0].credit)
    : 0;

  const periodOpeningSigned =
    ledger?.periodOpeningBalance !== undefined
      ? ledger.periodOpeningBalance
      : ledger && ledger.rows.length > 0
        ? ledger.rows[0].runningBalance - runningDeltaForFirstRow
        : (ledger?.person.openingBalance ?? 0);

  const periodOpeningAbs =
    ledger?.periodOpeningBalanceAbs ?? Math.abs(periodOpeningSigned);
  const periodOpeningSide: LiabilityBalanceSide =
    ledger?.periodOpeningSide ?? liabilitySideFromSigned(periodOpeningSigned);

  const periodClosingSigned =
    ledger && ledger.rows.length > 0
      ? ledger.rows[ledger.rows.length - 1].runningBalance
      : (ledger?.closingBalance ?? 0);
  const periodClosingAbs =
    ledger && ledger.rows.length > 0
      ? ledger.rows[ledger.rows.length - 1].runningBalanceAbs
      : Math.abs(ledger?.closingBalance ?? 0);
  const closingSide: LiabilityBalanceSide =
    ledger && ledger.rows.length > 0
      ? ledger.rows[ledger.rows.length - 1].runningBalanceSide
      : ledger?.closingSide ?? liabilitySideFromSigned(ledger?.closingBalance ?? 0);

  const balanceType =
    closingSide === "receivable"
      ? "Receivable"
      : closingSide === "payable"
        ? "Payable"
        : "Settled";

  const finalBalanceTone = !ledger
    ? {
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        cardClass: "bg-slate-50/50",
        labelClass: "text-slate-600",
        amountClass: "text-slate-900",
        footerClass: "text-slate-900 bg-slate-100",
      }
    : closingSide === "receivable"
      ? {
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          cardClass: "bg-emerald-50/40 border-l border-emerald-200",
          labelClass: "text-emerald-700",
          amountClass: "text-emerald-700",
          footerClass: "text-emerald-800 bg-emerald-50/70",
        }
      : closingSide === "payable"
        ? {
            badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
            cardClass: "bg-rose-50/40 border-l border-rose-200",
            labelClass: "text-rose-700",
            amountClass: "text-rose-700",
            footerClass: "text-rose-800 bg-rose-50/70",
          }
        : {
            badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
            cardClass: "bg-slate-50/50",
            labelClass: "text-slate-600",
            amountClass: "text-slate-900",
            footerClass: "text-slate-900 bg-slate-100",
          };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />

      <div className="space-y-4 pb-8 max-w-[1400px] mx-auto no-print">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
            Liability Person Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Running receivable/payable ledger for liability accounts.
          </p>
        </div>

        {/* Filter Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[280px] flex-1 space-y-1.5">
              <FieldLabel>Liability Person <span className="text-red-500">*</span></FieldLabel>
              <AutocompleteField
                value={personId}
                onChange={(v) => {
                  setPersonId(v);
                  setLedger(null);
                }}
                loadOptions={loadPersonOptions}
                placeholder="Search person..."
              />
            </div>
          </div>

          {/* Preset Dates + Custom */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
            <div className="flex items-center gap-1.5 min-w-max">
              <IconCalendar className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 mr-2">Range:</span>
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.filter(p => !['Last 6M', 'This Year'].includes(p.label)).map((p) => (
                  <Button
                    key={p.label}
                    size="xs"
                    variant={activePreset === p.label ? "primary" : "secondary"}
                    onClick={() => handlePreset(p)}
                    className={cn(
                      "text-[10px] px-2.5 h-6 rounded-full font-semibold",
                      activePreset === p.label ? "shadow-sm" : "bg-white border-slate-200 font-medium"
                    )}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={fromDate} 
                onChange={(e) => { setFromDate(e.target.value); setActivePreset(null); }} 
                className="text-xs h-8 px-2 w-[130px] bg-white border-slate-200" 
              />
              <span className="text-[10px] text-slate-400">to</span>
              <Input 
                type="date" 
                value={toDate} 
                onChange={(e) => { setToDate(e.target.value); setActivePreset(null); }} 
                className="text-xs h-8 px-2 w-[130px] bg-white border-slate-200" 
              />
            </div>
            
            <div className="h-5 w-px bg-slate-200" />

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">Balance perspective</span>
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("person");
                    setLedger(null);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                    viewMode === "person" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  Person (master)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("platform");
                    setLedger(null);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                    viewMode === "platform" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  Platform
                </button>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200" />

            <Button 
              onClick={onLoad} 
              loading={loading} 
              className="h-8 text-xs font-semibold px-4 ml-auto"
              startIcon={<IconFilter size={16} />}
            >
              Generate Statement
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

      {ledger && (
        <div id="print-container" ref={printRef} className="max-w-[1400px] mx-auto bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden print:border-none print:shadow-none print:rounded-none mb-8">
          {/* Statement Header */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 print:bg-white flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{ledger.person.name}</h2>
              <p className="text-slate-600 font-medium text-lg mt-0.5">Account Statement</p>
              <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                <span>Period: <strong className="text-slate-700">{fromDate ? new Date(fromDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year:'numeric'}) : 'Start'}</strong> to <strong className="text-slate-700">{toDate ? new Date(toDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year:'numeric'}) : 'Today'}</strong></span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>Generated: {new Date().toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year:'numeric', hour: '2-digit', minute: '2-digit'})}</span>
              </div>
            </div>
            <div className="no-print flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    loading={exporting}
                    startIcon={<IconDownload size={18} />}
                  >
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="" inset={false}>Choose Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onExportClick} className="cursor-pointer">
                    <IconFileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                    <span>Excel (.xlsx)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                    <IconFileText className="mr-2 h-4 w-4 text-rose-600" />
                    <span>PDF Report (.pdf)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-200 bg-white">
            <div className="p-4 flex flex-col justify-center gap-1">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-400 mb-0.5">Opening balance</span>
              <span className={cn("text-xl font-bold", liabilitySideAmountClass(periodOpeningSide))}>
                {fmtLiability(periodOpeningAbs)}
              </span>
              <span
                className={cn(
                  "inline-flex w-fit rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                  liabilitySideBadgeClass(periodOpeningSide),
                )}
              >
                {periodOpeningSide}
              </span>
            </div>
            <div className="p-4 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                <IconArrowUpRight className="w-3 h-3" /> Total inward (DR)
              </span>
              <span className="text-xl font-bold text-slate-800">{fmtLiability(totalDebits)}</span>
            </div>
            <div className="p-4 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                <IconArrowDownRight className="w-3 h-3" /> Total outward (CR)
              </span>
              <span className="text-xl font-bold text-slate-800">{fmtLiability(totalCredits)}</span>
            </div>
            <div className={cn("p-4 flex flex-col justify-center", finalBalanceTone.cardClass)}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={cn("text-[10px] uppercase font-semibold tracking-widest", finalBalanceTone.labelClass)}>
                  Closing Balance
                </span>
                <span className={cn("text-[9px] uppercase tracking-wider font-semibold border rounded-full px-2 py-0.5", finalBalanceTone.badgeClass)}>
                  Final: {balanceType}
                </span>
              </div>
              <span className={cn("text-2xl font-bold", finalBalanceTone.amountClass)}>
                {fmtLiability(periodClosingAbs)}
              </span>
            </div>
          </div>

          {/* Help Note */}
          <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-2">
             <span className="text-[10px] text-slate-400">
               * Inward and outward are movement amounts (always shown positive). Balance column shows receivable or payable using green and red.
             </span>
             <span className="text-[10px] text-slate-500 ml-2">
               {ledger.viewMode === "person"
                 ? "Person-side view — closing matches the Liability Person master total for full history."
                 : "Platform-side view — running balance uses the inverted sign convention from the master list."}
             </span>
          </div>

          {/* Ledger Table */}
          <div className="w-full">
            <table className="w-full text-xs text-left align-top">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-[180px]">Date & Time</th>
                  <th className="py-3 px-4">Type / Description</th>
                  <th className="py-3 px-4">From / To</th>
                  <th className="py-3 px-4 text-right w-[120px]">Operated Amount</th>
                  <th className="py-3 px-4 w-[120px]">Currency / Rate</th>
                  <th className="py-3 px-4 text-right w-[120px]">Inward (DR)</th>
                  <th className="py-3 px-4 text-right w-[120px]">Outward (CR)</th>
                  <th className="py-3 px-4 text-right w-[160px] bg-slate-100/50 border-l border-slate-200 text-slate-800">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <p className="text-slate-500 font-medium">No transactions found for the selected period.</p>
                    </td>
                  </tr>
                ) : (
                  ledger.rows.map((r, i) => (
                    <tr
                      key={`${r._id}-${i}`}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {formatDateTimeForUser(r.at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 capitalize">{r.entryType}</div>
                        {r.referenceNo && <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {r.referenceNo}</div>}
                        {r.remark && <div className="text-[10px] text-slate-500 italic mt-0.5">{r.remark}</div>}
                      </td>
                      <td className="py-3 px-4">
                         <div className="text-slate-600">
                           <span className="text-[10px] text-slate-400">F:</span> {r.from}
                         </div>
                         <div className="text-slate-600">
                           <span className="text-[10px] text-slate-400">T:</span> {r.to}
                         </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        <FxOperatedAmountCell
                          operatedAmount={r.operatedAmount}
                          operatedCurrency={r.operatedCurrency}
                        />
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <FxCurrencyRateCell
                          operatedCurrency={r.operatedCurrency}
                          exchangeRate={r.exchangeRate}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.debit > 0 ? (
                          <span className="font-semibold text-slate-700">{fmtLiability(r.debit)}</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.credit > 0 ? (
                          <span className="font-semibold text-slate-700">{fmtLiability(r.credit)}</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right bg-slate-50/30 border-l border-slate-100">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={cn("font-semibold", liabilitySideAmountClass(r.runningBalanceSide))}>
                            {fmtLiability(r.runningBalanceAbs)}
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                              liabilitySideBadgeClass(r.runningBalanceSide),
                            )}
                          >
                            {r.runningBalanceSide}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 print:table-footer-group">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                    Ledger Totals ({ledger.rows.length} entries)
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800">
                    {fmtLiability(totalDebits)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800">
                    {fmtLiability(totalCredits)}
                  </td>
                  <td className={cn("py-3 px-4 text-right font-bold", finalBalanceTone.footerClass)}>
                    {fmtLiability(periodClosingAbs)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="p-6 text-center text-[10px] text-slate-400 border-t border-slate-100 print:block">
            <p>*** End of Statement ***</p>
            <p className="mt-1">{BRANDING.generatedBySystemText}</p>
          </div>
        </div>
      )}
    </>
  );
}
