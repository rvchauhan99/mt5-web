"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { IconCheck, IconFilter, IconRefresh, IconDownload, IconFileSpreadsheet, IconFileText } from "@tabler/icons-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from "@/components/ui/shadcn/dropdown-menu";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
} from "@/components/common/OperatedMoneyFields";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/cn";
import { createExchangeTopup, listExchanges, listExchangeTopups, exportExchangeTopups } from "@/services/exchangeService";
import { useExport } from "@/hooks/useExport";
import type { ExchangeTopupRow } from "@/types/exchange";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { formatDateTimeForUser } from "@/lib/userTimezone";

function createdByLabel(createdBy: ExchangeTopupRow["createdBy"]): string {
  if (!createdBy || typeof createdBy === "string") return "";
  return createdBy.fullName?.trim() || createdBy.username?.trim() || "";
}

export function ExchangeTopUpClient() {
  const { platformCurrency } = usePlatformSettings();
  const { formatMoney } = useFormatMoney();
  const formatAmount = (value: number) => formatMoney(Number(value || 0));
  const [exchangeId, setExchangeId] = useState("");
  const [money, setMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExchangeTopupRow[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!platformCurrency) return;
    setMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency]);

  const loadExchangeOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const res = await listExchanges({ page: 1, limit: 40, q: query || undefined, sortBy: "name", sortOrder: "asc" });
      return res.items.map((item) => ({
        value: item._id ?? item.id,
        label: `${item.name} (${item.provider})`,
      }));
    } catch {
      return [];
    }
  }, []);

  const refreshTopups = useCallback(async () => {
    if (!exchangeId.trim()) {
      setRows([]);
      setCurrentBalance(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listExchangeTopups({ exchangeId: exchangeId.trim(), page: 1, pageSize: 50, sortOrder: "desc" });
      setRows(res.items);
      setCurrentBalance(res.items[0]?.exchangeId?.currentBalance ?? null);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to load top up history"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  const { exporting, handleExport } = useExport((params) => exportExchangeTopups(params), {
    fileName: `exchange-topups-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      exchangeId: exchangeId.trim() || undefined,
      sortOrder: "desc",
    });
  }, [handleExport, exchangeId]);

  const submitTopup = async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    if (!exchangeId.trim()) {
      setError("Please select exchange.");
      return;
    }
    const operatedAmt = Number(money.amount);
    if (!money.amount.trim() || !Number.isFinite(operatedAmt) || operatedAmt <= 0) {
      setError("Please enter valid amount.");
      return;
    }
    if ((money.operatedCurrency || platformCurrency) !== platformCurrency) {
      const rate = Number(money.exchangeRate);
      if (!money.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        setError("Please enter a valid exchange rate.");
        return;
      }
    }
    const fx = toMoneyFxPayload(money, platformCurrency, "decimal");
    setSubmitting(true);
    setError(null);
    try {
      const created = await createExchangeTopup({
        exchangeId: exchangeId.trim(),
        amount: fx.amount,
        operatedCurrency: fx.operatedCurrency,
        operatedAmount: fx.operatedAmount,
        exchangeRate: fx.exchangeRate,
        remark: remark.trim() || undefined,
      });
      setMoney(defaultOperatedMoneyValue(platformCurrency));
      setRemark("");
      setCurrentBalance(created.currentBalance ?? null);
      await refreshTopups();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create top up"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Exchange Top Up</h1>
        <p className="text-xs text-slate-400 mt-0.5">Direct credit into exchange balance (no bank transaction).</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-1.5">
            <FieldLabel>Exchange</FieldLabel>
            <AutocompleteField
              value={exchangeId}
              onChange={(value) => {
                setExchangeId(value);
                setRows([]);
                setCurrentBalance(null);
              }}
              loadOptions={loadExchangeOptions}
              placeholder="Search exchange..."
            />
          </div>
          <OperatedMoneyFields
            value={money}
            onChange={setMoney}
            amountLabel="Top Up Amount"
            roundMode="decimal"
            minAmount={0.01}
            idPrefix="exchange-topup"
          />
          <div className="space-y-1.5">
            <FieldLabel>Remark</FieldLabel>
            <Input value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Optional remark" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={submitTopup} 
            loading={submitting}
            startIcon={<IconCheck size={18} />}
          >
            Post Top Up
          </Button>
          <Button 
            variant="outline" 
            onClick={refreshTopups} 
            loading={loading}
            startIcon={<IconRefresh size={18} className={cn(loading && "animate-spin")} />}
          >
            Refresh
          </Button>
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
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="" inset={false}>Choose Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExportClick} className="cursor-pointer">
                <IconFileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()} className="cursor-pointer">
                <IconFileText className="mr-2 h-4 w-4 text-rose-600" />
                <span>PDF Report (.pdf)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {currentBalance != null ? (
            <div className="ml-auto text-sm text-slate-700">
              Current Balance: <span className="font-semibold">{formatAmount(currentBalance)}</span>
            </div>
          ) : null}
        </div>

        {error ? <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div> : null}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 text-sm font-medium text-slate-700">
          <IconFilter className="w-4 h-4" />
          Top Up History
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Exchange</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Remark</th>
                <th className="text-left px-4 py-3">Created By</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {loading ? "Loading..." : "No top up entries found."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTimeForUser(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.exchangeId?.name} ({row.exchangeId?.provider})
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatAmount(row.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.remark || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{createdByLabel(row.createdBy) || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
