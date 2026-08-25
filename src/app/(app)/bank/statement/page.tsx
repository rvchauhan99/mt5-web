"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  IconPrinter,
  IconFilter,
  IconCalendar,
  IconArrowUpRight,
  IconArrowDownRight,
  IconInfoCircle,
} from "@tabler/icons-react";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  createBankSettlement,
  getBankComputedClosing,
  getBankLedger,
  listBanksRaw,
  type BankLedgerResponse,
} from "@/services/bankService";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/cn";
import { DATE_PRESETS } from "@/modules/dashboard/components/DashboardFilterBar";
import { BRANDING } from "@/lib/constants/branding";
import { useAuth } from "@/context/AuthContext";
import { formControlFocus } from "@/lib/formControlClasses";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { formatScaledMoney } from "@/lib/formatMoney";
import {
  currentDateTimeLocalValue,
  dateTimeLocalValueToUtcIso,
  formatDateTimeForUser,
} from "@/lib/userTimezone";

const ENTRY_TYPES = ["all", "deposit", "withdrawal", "expense", "liability", "settlement", "referral"] as const;
type EntryTypeFilter = (typeof ENTRY_TYPES)[number];

export default function BankStatementPage() {
  const { platformCurrency } = useFormatMoney();
  const formatAmount = (value: number) => formatScaledMoney(value, platformCurrency);
  const { user } = useAuth();
  const isSuperadmin = user?.role === "superadmin";
  const [bankId, setBankId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entryType, setEntryType] = useState<EntryTypeFilter>("all");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const [systemClosingBalance, setSystemClosingBalance] = useState<number | null>(null);
  const [systemClosingLoading, setSystemClosingLoading] = useState(false);
  const [masterReportedBalance, setMasterReportedBalance] = useState("");
  const [settlementReason, setSettlementReason] = useState("");
  const [settlementEffectiveAt, setSettlementEffectiveAt] = useState(() => currentDateTimeLocalValue());
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  const [ledger, setLedger] = useState<BankLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const loadBankOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const res = await listBanksRaw(1, 40); // passing page and limit manually, simplistic fallback
      return res.data.map((b: any) => ({
        value: b._id || b.id,
        label: `${b.holderName} - ${b.bankName} (${String(b.accountNumber).slice(-4)})`,
      }));
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!isSuperadmin || !bankId.trim()) {
      setSystemClosingBalance(null);
      setSettlementError(null);
      return;
    }
    let cancelled = false;
    setSystemClosingLoading(true);
    getBankComputedClosing(bankId.trim())
      .then((res) => {
        if (!cancelled) setSystemClosingBalance(res.systemClosingBalance);
      })
      .catch(() => {
        if (!cancelled) setSystemClosingBalance(null);
      })
      .finally(() => {
        if (!cancelled) setSystemClosingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bankId, isSuperadmin]);

  const loadLedger = useCallback(async () => {
    if (!bankId.trim()) {
      setError("Please select a bank account first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getBankLedger(bankId.trim(), {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        entryType,
      });
      setLedger(data);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to load statement"));
      setLedger(null);
    } finally {
      setLoading(false);
    }
  }, [bankId, fromDate, toDate, entryType]);

  const handleSettlementSubmit = async () => {
    if (!bankId.trim()) {
      setSettlementError("Select a bank first.");
      return;
    }
    const master = Number(masterReportedBalance);
    if (!Number.isFinite(master) || master < 0) {
      setSettlementError("Enter a valid non-negative master balance.");
      return;
    }
    const reason = settlementReason.trim();
    if (reason.length < 3) {
      setSettlementError("Reason must be at least 3 characters.");
      return;
    }
    const effectiveIso = dateTimeLocalValueToUtcIso(settlementEffectiveAt);
    if (!effectiveIso) {
      setSettlementError("Invalid effective date/time.");
      return;
    }
    setSettlementSubmitting(true);
    setSettlementError(null);
    try {
      await createBankSettlement(bankId.trim(), {
        effectiveAt: effectiveIso,
        masterReportedBalance: master,
        reason,
      });
      setSettlementReason("");
      const next = await getBankComputedClosing(bankId.trim());
      setSystemClosingBalance(next.systemClosingBalance);
      await loadLedger();
    } catch (e: unknown) {
      setSettlementError(getApiErrorMessage(e, "Settlement failed"));
    } finally {
      setSettlementSubmitting(false);
    }
  };

  const handlePreset = (preset: (typeof DATE_PRESETS)[0]) => {
    const dates = preset.fn();
    setFromDate(dates.date_from);
    setToDate(dates.date_to);
    setActivePreset(preset.label);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* 
        We use a global style for printing. It hides elements outside the print-container and 
        formats the page layout properly for A4 landscape.
      */}
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
            Bank Statement
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Professional ledger with credit/debit entries and bonus memorandums.
          </p>
        </div>

        {/* Filter Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[280px] flex-1 space-y-1.5">
              <FieldLabel>Bank Account <span className="text-red-500">*</span></FieldLabel>
              <AutocompleteField
                value={bankId}
                onChange={(v) => {
                  setBankId(v);
                  setLedger(null);
                  setMasterReportedBalance("");
                  setSettlementReason("");
                  setSettlementEffectiveAt(currentDateTimeLocalValue());
                }}
                loadOptions={loadBankOptions}
                placeholder="Search bank..."
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

            <div className="flex items-center gap-1 flex-1">
              <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 mr-2">Type:</span>
              <div className="flex gap-1">
                {ENTRY_TYPES.map((type) => (
                  <Button
                    key={type}
                    size="xs"
                    variant={entryType === type ? "secondary" : "ghost"}
                    onClick={() => setEntryType(type)}
                    className={cn(
                      "text-[11px] px-2.5 h-7 rounded-md capitalize font-medium",
                      entryType === type ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              onClick={loadLedger} 
              loading={loading} 
              className="h-9 text-xs font-semibold px-4 ml-auto"
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

          {isSuperadmin && bankId.trim() && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-amber-950">Master balance settlement</h3>
                <p className="text-[11px] text-amber-900/80 mt-0.5">
                  Superadmin only. Enter the bank&apos;s current balance (passbook / net banking). The ERP records the
                  difference as a settlement line and updates stored current balance.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel>System balance before settle</FieldLabel>
                  <div className="text-sm font-mono font-semibold text-slate-800 min-h-8 flex items-center">
                    {systemClosingLoading ? "…" : systemClosingBalance != null ? formatAmount(systemClosingBalance) : "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <FieldLabel>
                    Bank current / closing balance (master) <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={masterReportedBalance}
                    onChange={(e) => setMasterReportedBalance(e.target.value)}
                    className="text-xs h-9"
                    placeholder="Amount from bank"
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Effective date &amp; time</FieldLabel>
                  <Input
                    type="datetime-local"
                    value={settlementEffectiveAt}
                    onChange={(e) => setSettlementEffectiveAt(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <FieldLabel>
                    Reason <span className="text-red-500">*</span>
                  </FieldLabel>
                  <textarea
                    value={settlementReason}
                    onChange={(e) => setSettlementReason(e.target.value)}
                    rows={2}
                    className={cn(
                      "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400",
                      formControlFocus,
                    )}
                    placeholder="Why this adjustment (audit trail)"
                  />
                </div>
              </div>
              {settlementError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1.5">
                  {settlementError}
                </div>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={settlementSubmitting}
                onClick={handleSettlementSubmit}
                className="text-xs"
              >
                Record settlement
              </Button>
            </div>
          )}
        </div>
      </div>

      {ledger && (
        <div id="print-container" ref={printRef} className="max-w-[1400px] mx-auto bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
          {/* Statement Header / Letterhead */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 print:bg-white flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{ledger.bank.holderName}</h2>
              <p className="text-slate-600 font-medium text-lg mt-0.5">{ledger.bank.bankName}</p>
              <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                <span>Account No: <strong className="text-slate-700 font-mono">{ledger.bank.accountNumber}</strong></span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>Period: <strong className="text-slate-700">{fromDate ? new Date(fromDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year:'numeric'}) : 'Start'}</strong> to <strong className="text-slate-700">{toDate ? new Date(toDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year:'numeric'}) : 'Today'}</strong></span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>Generated: {new Date().toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year:'numeric', hour: '2-digit', minute: '2-digit'})}</span>
              </div>
            </div>
            <div className="no-print">
              <Button 
                onClick={handlePrint} 
                variant="secondary" 
                startIcon={<IconPrinter size={18} />}
              >
                Print PDF
              </Button>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-200 bg-white">
            <div className="p-4 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-400 mb-1">Opening Balance</span>
              <span className="text-xl font-bold text-slate-800">{formatAmount(ledger.periodOpeningBalance)}</span>
            </div>
            <div className="p-4 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-emerald-600/70 mb-1 flex items-center gap-1"><IconArrowUpRight className="w-3 h-3"/> Total Credits</span>
              <span className="text-xl font-bold text-emerald-700">{formatAmount(ledger.totalCredits)}</span>
            </div>
            <div className="p-4 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-rose-600/70 mb-1 flex items-center gap-1"><IconArrowDownRight className="w-3 h-3"/> Total Debits</span>
              <span className="text-xl font-bold text-rose-700">{formatAmount(ledger.totalDebits)}</span>
            </div>
            <div className="p-4 flex flex-col justify-center bg-slate-50/50">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-600 mb-1">Closing Balance</span>
              <span className="text-2xl font-bold text-slate-900">{formatAmount(ledger.periodClosingBalance)}</span>
            </div>
          </div>

          {/* Bonus Memo Strip (if any bonus given/reversed) */}
          {(ledger.totalBonusGiven > 0 || ledger.totalBonusReversed > 0) && (
            <div className="bg-amber-50/50 border-b border-amber-100/50 px-6 py-2 flex items-center gap-6">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <IconInfoCircle className="w-3 h-3" /> Off-Balance Sheet Memos:
              </span>
              {ledger.totalBonusGiven > 0 && (
                <span className="text-xs font-medium text-amber-700">
                  Total Bonus Given: {formatAmount(ledger.totalBonusGiven)}
                </span>
              )}
              {ledger.totalBonusReversed > 0 && (
                <span className="text-xs font-medium text-amber-700">
                  Total Bonus Reversed: {formatAmount(ledger.totalBonusReversed)}
                </span>
              )}
            </div>
          )}

          {/* Ledger Table */}
          <div className="w-full">
            <table className="w-full text-xs text-left align-top">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-[160px]">Date & Time</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 w-[160px]">Trader / Ref</th>
                  <th className="py-3 px-4 text-right w-[120px]">Credit (CR)</th>
                  <th className="py-3 px-4 text-right w-[120px]">Debit (DR)</th>
                  <th className="py-3 px-4 text-right w-[140px] bg-slate-100/50 border-l border-slate-200 text-slate-800">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <p className="text-slate-500 font-medium">No transactions found for the selected period.</p>
                    </td>
                  </tr>
                ) : (
                  ledger.rows.map((r, i) => (
                    <tr 
                      key={`${r.kind}-${r.refId}-${i}`} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group",
                        r.kind === "deposit" && "bg-emerald-50/10",
                        r.kind === "withdrawal" && "bg-rose-50/10",
                        r.kind === "settlement" && "bg-amber-50/20",
                        r.kind === "liability" && "bg-slate-50/40",
                        r.kind === "referral" && "bg-sky-50/40",
                      )}
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {formatDateTimeForUser(r.at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{r.label}</div>
                        {r.utr && <div className="text-[10px] text-slate-400 font-mono mt-0.5">Reference Number: {r.utr}</div>}
                        {r.bonusMemo && r.bonusMemo > 0 && (r.kind === "deposit" || r.kind === "withdrawal") && (
                          <div className="mt-1 text-[10px] text-amber-600 italic bg-amber-50 px-1.5 py-0.5 rounded inline-block">
                            * Memo: {formatAmount(r.bonusMemo)} bonus {r.kind === "deposit" ? "given" : "reversed"} (Not in bank)
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {r.kind === "referral" && !r.playerName && (
                          <div className="font-medium text-sky-800">IB settle</div>
                        )}
                        {r.playerName && <div className="font-medium text-slate-700 truncate max-w-[140px]" title={r.playerName}>{r.playerName}</div>}
                        {r.createdByName && <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">By: {r.createdByName}</div>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.direction === "credit" ? (
                          <span className="font-semibold text-emerald-600">
                            {formatAmount(r.amount)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.direction === "debit" ? (
                          <span className="font-semibold text-rose-600">
                            {formatAmount(r.amount)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800 bg-slate-50/30 border-l border-slate-100">
                        {formatAmount(r.balanceAfter)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 print:table-footer-group">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                    Ledger Totals ({ledger.rows.length} entries)
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {formatAmount(ledger.totalCredits)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-700">
                    {formatAmount(ledger.totalDebits)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-100">
                    {formatAmount(ledger.periodClosingBalance)}
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
