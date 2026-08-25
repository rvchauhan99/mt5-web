"use client";

import { IconBuildingBank } from "@tabler/icons-react";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { type DashboardSummary } from "./DashboardKPIs";

interface Props {
  banksBreakdown: DashboardSummary["banksBreakdown"];
  loading?: boolean;
}

function formatCount(value: number) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function AmountWithTxnCount({
  amount,
  count,
  amountClass,
  formatMoney,
}: {
  amount: number;
  count: number;
  amountClass: string;
  formatMoney: (value: number) => string;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5 leading-tight">
      <span className={amountClass}>{formatMoney(amount)}</span>
      <span className="text-[10px] font-medium tabular-nums text-slate-500">{formatCount(count)} txn</span>
    </div>
  );
}

export function DashboardBankSummary({ banksBreakdown, loading = false }: Props) {
  const { formatMoney } = useFormatMoney();
  const fmt = (value: number) => formatMoney(value, { includeSign: true });

  if (!banksBreakdown || banksBreakdown.length === 0) {
    if (!loading) return null;
    return (
      <div className="mt-8 space-y-3">
        <div className="h-6 w-52 bg-slate-200 rounded animate-pulse" />
        <div className="h-52 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const totals = banksBreakdown.reduce(
    (acc, bank) => ({
      openingBalance: acc.openingBalance + Number(bank.openingBalance ?? 0),
      deposit: acc.deposit + Number(bank.deposit ?? 0),
      depositCount: acc.depositCount + Number(bank.depositCount ?? 0),
      withdrawal: acc.withdrawal + Number(bank.withdrawal ?? 0),
      withdrawalCount: acc.withdrawalCount + Number(bank.withdrawalCount ?? 0),
      expenses: acc.expenses + Number(bank.expenses ?? 0),
      expenseCount: acc.expenseCount + Number(bank.expenseCount ?? 0),
      transferOut: acc.transferOut + Number(bank.transferOut ?? 0),
      transferOutCount: acc.transferOutCount + Number(bank.transferOutCount ?? 0),
      transferIn: acc.transferIn + Number(bank.transferIn ?? 0),
      transferInCount: acc.transferInCount + Number(bank.transferInCount ?? 0),
      entries: acc.entries + Number(bank.entries ?? 0),
      closingBalance: acc.closingBalance + Number(bank.closingBalance ?? 0),
    }),
    { openingBalance: 0, deposit: 0, depositCount: 0, withdrawal: 0, withdrawalCount: 0, expenses: 0, expenseCount: 0, transferOut: 0, transferOutCount: 0, transferIn: 0, transferInCount: 0, entries: 0, closingBalance: 0 }
  );

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2">
        <IconBuildingBank className="w-5 h-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900 tracking-tight">Bank Wise Summary</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap align-bottom">Bank Details</th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom">Opening Balance</th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom">
                  <span className="block">Deposit</span>
                  <span className="block text-[10px] font-normal text-slate-500">Amount / # txn</span>
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom">
                  <span className="block">Withdrawal</span>
                  <span className="block text-[10px] font-normal text-slate-500">Amount / # txn</span>
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom">
                  <span className="block">Expenses</span>
                  <span className="block text-[10px] font-normal text-slate-500">Amount / # txn</span>
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom">
                  <span className="block">Transfer Out</span>
                  <span className="block text-[10px] font-normal text-slate-500">Amount / # txn</span>
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom">
                  <span className="block">Transfer In</span>
                  <span className="block text-[10px] font-normal text-slate-500">Amount / # txn</span>
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom">Total txn</th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom">Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              {banksBreakdown.map((bank) => (
                <tr key={bank.bankId} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-800">{bank.name}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-700">
                    {fmt(bank.openingBalance)}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <AmountWithTxnCount
                      amount={bank.deposit}
                      count={bank.depositCount}
                      amountClass="text-emerald-700"
                      formatMoney={fmt}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <AmountWithTxnCount
                      amount={bank.withdrawal}
                      count={bank.withdrawalCount}
                      amountClass="text-rose-700"
                      formatMoney={fmt}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <AmountWithTxnCount
                      amount={bank.expenses}
                      count={bank.expenseCount}
                      amountClass="text-amber-700"
                      formatMoney={fmt}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <AmountWithTxnCount
                      amount={bank.transferOut}
                      count={bank.transferOutCount}
                      amountClass="text-rose-700"
                      formatMoney={fmt}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <AmountWithTxnCount
                      amount={bank.transferIn}
                      count={bank.transferInCount}
                      amountClass="text-emerald-700"
                      formatMoney={fmt}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-700">
                    {formatCount(bank.entries)}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-slate-900">
                    {fmt(bank.closingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900">TOTAL</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-slate-900">
                  {fmt(totals.openingBalance)}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <AmountWithTxnCount
                    amount={totals.deposit}
                    count={totals.depositCount}
                    amountClass="font-semibold text-emerald-700"
                    formatMoney={fmt}
                  />
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <AmountWithTxnCount
                    amount={totals.withdrawal}
                    count={totals.withdrawalCount}
                    amountClass="font-semibold text-rose-700"
                    formatMoney={fmt}
                  />
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <AmountWithTxnCount
                    amount={totals.expenses}
                    count={totals.expenseCount}
                    amountClass="font-semibold text-amber-700"
                    formatMoney={fmt}
                  />
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <AmountWithTxnCount
                    amount={totals.transferOut}
                    count={totals.transferOutCount}
                    amountClass="font-semibold text-rose-700"
                    formatMoney={fmt}
                  />
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <AmountWithTxnCount
                    amount={totals.transferIn}
                    count={totals.transferInCount}
                    amountClass="font-semibold text-emerald-700"
                    formatMoney={fmt}
                  />
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-slate-900">
                  {formatCount(totals.entries)}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap font-bold text-slate-900">
                  {fmt(totals.closingBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
