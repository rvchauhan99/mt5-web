"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { 
  IconUsers, 
  IconArrowUpRight, 
  IconArrowDownRight, 
  IconScale, 
  IconSearch, 
  IconCircleCheck, 
  IconCircleX, 
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
import { getLiabilityPersonWiseReport, getLiabilitySummaryReport } from "@/services/liabilityService";
import type { LiabilityPersonWiseReportRow, LiabilitySummaryReport } from "@/types/liability";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BRANDING } from "@/lib/constants/branding";
import {
  formatLiabilityMoneyAbs,
  liabilitySideAmountClass,
  liabilitySideBadgeClass,
  liabilitySideFromSigned,
} from "@/lib/liabilityDisplay";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import type { LiabilityBalanceSide } from "@/types/liability";

export function LiabilityReportClient() {
  const { platformCurrency } = useFormatMoney();
  const fmtLiability = (value: number) => formatLiabilityMoneyAbs(value, platformCurrency);
  const [summary, setSummary] = useState<LiabilitySummaryReport | null>(null);
  const [rows, setRows] = useState<LiabilityPersonWiseReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([getLiabilitySummaryReport(), getLiabilityPersonWiseReport()]);
        if (!cancelled) {
          setSummary(s);
          setRows(r);
        }
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Failed to load liability report"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const handlePrint = () => {
    window.print();
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
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Liability Summary Report
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Receivable/payable summary and person-wise balances.
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Showing Platform-side view</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
              <Input 
                placeholder="Search person..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs w-[240px] bg-white border-slate-200 focus:border-slate-300 focus:ring-0 transition-all rounded-lg"
              />
            </div>
            {summary && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    startIcon={<IconDownload size={16} />}
                  >
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="" inset={false}>Choose Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { /* Implement Excel export for summary if backend supports it */ }} className="cursor-pointer opacity-50 cursor-not-allowed">
                    <IconFileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                    <span>Excel (Coming soon)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                    <IconFileText className="mr-2 h-4 w-4 text-rose-600" />
                    <span>PDF Report (.pdf)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {loading ? (
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
             <div className="inline-flex items-center gap-2 text-slate-400 font-medium">
               <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
               Loading report data...
             </div>
           </div>
        ) : (
          <>
            {summary && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100 grid grid-cols-2 md:grid-cols-4">
                <div className="p-4 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600/70 mb-1 flex items-center gap-1">
                    <IconArrowUpRight className="w-3 h-3"/> Total Receivable
                  </span>
                  <span className="text-xl font-bold text-emerald-700">
                    {fmtLiability(summary.totalReceivable)}
                  </span>
                </div>
                <div className="p-4 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-rose-600/70 mb-1 flex items-center gap-1">
                    <IconArrowDownRight className="w-3 h-3"/> Total Payable
                  </span>
                  <span className="text-xl font-bold text-rose-700">
                    {fmtLiability(summary.totalPayable)}
                  </span>
                </div>
                <div className="p-4 flex flex-col justify-center gap-1">
                  {(() => {
                    const netSide: LiabilityBalanceSide =
                      summary.netPositionSide ?? liabilitySideFromSigned(summary.netPosition);
                    const netAbs = summary.netPositionAbs ?? Math.abs(summary.netPosition);
                    const netTitle =
                      netSide === "receivable"
                        ? "Net receivable"
                        : netSide === "payable"
                          ? "Net payable"
                          : "Net position";
                    return (
                      <>
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold tracking-widest mb-0.5 flex items-center gap-1",
                            netSide === "receivable"
                              ? "text-emerald-600/70"
                              : netSide === "payable"
                                ? "text-rose-600/70"
                                : "text-slate-500",
                          )}
                        >
                          <IconScale className="w-3 h-3" /> {netTitle}
                        </span>
                        <span className={cn("text-xl font-bold", liabilitySideAmountClass(netSide))}>
                          {fmtLiability(netAbs)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex w-fit rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            liabilitySideBadgeClass(netSide),
                          )}
                        >
                          {netSide}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div className="p-4 flex flex-col justify-center bg-slate-50/50">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                    <IconUsers className="w-3 h-3"/> Total Persons
                  </span>
                  <span className="text-xl font-bold text-slate-800">{summary.totalPersons}</span>
                </div>
              </div>
            )}

            {filteredRows.length > 0 && (
              <div id="print-container" ref={printRef} className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
                {/* Letterhead */}
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 print:bg-white flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{BRANDING.liabilitySummaryTitle}</h2>
                    <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                      <span>Total Accounts: <strong className="text-slate-700 font-mono">{filteredRows.length}</strong></span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>Generated: {new Date().toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year:'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                  </div>
                  <div className="text-right hidden print:block">
                     <p className="text-xs text-slate-400 italic">Financial Summary Report</p>
                  </div>
                </div>

                <div className="w-full">
                  <table className="w-full text-xs text-left align-top">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Liability Person</th>
                        <th className="py-3 px-4 w-[160px]">Status</th>
                        <th className="py-3 px-4 text-right w-[140px]">Inward (DR)</th>
                        <th className="py-3 px-4 text-right w-[140px]">Outward (CR)</th>
                        <th className="py-3 px-4 text-right w-[180px] bg-slate-100/30 border-l border-slate-200 text-slate-800">Balance</th>
                        <th className="py-3 px-4 w-[140px]">Side</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((r) => (
                        <tr key={r.personId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{r.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">ID: {r.personId.slice(-8).toUpperCase()}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                              r.isActive 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            )}>
                              {r.isActive ? (
                                <><IconCircleCheck className="w-2.5 h-2.5" /> Active</>
                              ) : (
                                <><IconCircleX className="w-2.5 h-2.5" /> Inactive</>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                             {r.totalDebits !== undefined ? (
                               <span className="text-slate-600">{fmtLiability(r.totalDebits)}</span>
                             ) : (
                               <span className="text-slate-400">—</span>
                             )}
                          </td>
                          <td className="py-3 px-4 text-right">
                             {r.totalCredits !== undefined ? (
                               <span className="text-slate-600">{fmtLiability(r.totalCredits)}</span>
                             ) : (
                               <span className="text-slate-400">—</span>
                             )}
                          </td>
                          <td className={cn(
                            "py-3 px-4 text-right font-bold text-sm bg-slate-50/20 border-l border-slate-100",
                            (r.sideLabel ?? r.side) === "receivable"
                              ? "text-emerald-700"
                              : (r.sideLabel ?? r.side) === "payable"
                                ? "text-rose-700"
                                : "text-slate-700"
                          )}>
                            {fmtLiability(r.balanceAbs ?? Math.abs(r.balance))}
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              (r.sideLabel ?? r.side) === "receivable"
                                ? "text-emerald-600/70"
                                : (r.sideLabel ?? r.side) === "payable"
                                  ? "text-rose-600/70"
                                  : "text-slate-500"
                            )}>
                              {r.sideLabel ?? r.side}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                       <tr>
                         <td colSpan={2} className="py-3 px-4 text-right font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                           Reporting Totals:
                         </td>
                         <td colSpan={2} className="py-3 px-4" />
                         <td className="py-3 px-4 text-right font-bold bg-slate-100/50">
                            {summary ? (
                              <span className="flex flex-col items-end gap-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Net
                                </span>
                                <span
                                  className={liabilitySideAmountClass(
                                    summary.netPositionSide ?? liabilitySideFromSigned(summary.netPosition),
                                  )}
                                >
                                  {fmtLiability(summary.netPositionAbs ?? Math.abs(summary.netPosition))}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                                    liabilitySideBadgeClass(
                                      summary.netPositionSide ?? liabilitySideFromSigned(summary.netPosition),
                                    ),
                                  )}
                                >
                                  {summary.netPositionSide ?? liabilitySideFromSigned(summary.netPosition)}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                         </td>
                         <td className="py-3 px-4" />
                       </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-6 text-center text-[10px] text-slate-400 border-t border-slate-100 print:block">
                  <p>*** End of Liability Summary Report ***</p>
                  <p className="mt-1">{BRANDING.liabilitySuiteFooter}</p>
                </div>
              </div>
            )}

            {filteredRows.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                <p className="text-slate-500 font-medium">No results found matching your search.</p>
                <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="mt-2 text-blue-600 hover:text-blue-700">Clear Search</Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
