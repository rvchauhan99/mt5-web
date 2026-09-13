"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IconChartDonut } from "@tabler/icons-react";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import type { BalanceSheetGroupNode, BalanceSheetTotals } from "@/types/balanceSheet";

interface BalanceSheetOverviewChartsProps { assets: BalanceSheetGroupNode[]; liabilities: BalanceSheetGroupNode[]; equity: BalanceSheetGroupNode[]; totals: BalanceSheetTotals; }
interface CompositionSlice { name: string; value: number; fill: string; }
const ASSET_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];
const LIABILITY_COLORS = ["#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#fecdd3"];
const EQUITY_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#94a3b8"];

function leaves(nodes: BalanceSheetGroupNode[]): BalanceSheetGroupNode[] {
  return nodes.flatMap((node) => node.subGroups.length ? leaves(node.subGroups) : [node]);
}

function Composition({ title, nodes, colors, total }: { title: string; nodes: BalanceSheetGroupNode[]; colors: string[]; total: number }) {
  const { formatMoney } = useFormatMoney();
  const data: CompositionSlice[] = leaves(nodes).filter((node) => node.total > 0).map((node, index) => ({ name: node.name, value: node.total, fill: colors[index % colors.length] }));
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-800">{title}</h3><p className="text-[11px] text-slate-400">By section</p></div><IconChartDonut className="h-4 w-4 text-slate-400" /></div>{data.length ? <><div className="relative h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={3} strokeWidth={0}>{data.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}</Pie><Tooltip formatter={(value) => formatMoney(Number(value))} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] text-slate-400">Total</span><span className="text-sm font-bold text-slate-700">{formatMoney(total)}</span></div></div><div className="space-y-1">{data.map((item) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />{item.name}</span><span className="font-semibold text-slate-700">{formatMoney(item.value)}</span></div>)}</div></> : <div className="flex h-56 items-center justify-center text-sm text-slate-400">No data to chart</div>}</div>;
}

export function BalanceSheetOverviewCharts({ assets, liabilities, equity, totals }: BalanceSheetOverviewChartsProps) {
  const { formatMoney } = useFormatMoney();
  const equation = [{ name: "Assets", assets: totals.totalAssets, liabilities: 0, equity: 0 }, { name: "Liabilities + Equity", assets: 0, liabilities: totals.totalLiabilities, equity: totals.totalEquity }];
  return <section className="space-y-3"><div><h2 className="text-sm font-bold text-slate-800">Overview</h2><p className="text-xs text-slate-400">Composition and accounting equation</p></div><div className="grid gap-4 lg:grid-cols-3"><Composition title="Assets composition" nodes={assets} colors={ASSET_COLORS} total={totals.totalAssets} /><Composition title="Liabilities & equity" nodes={[...liabilities, ...equity]} colors={[...LIABILITY_COLORS, ...EQUITY_COLORS]} total={totals.totalLiabilities + totals.totalEquity} /><div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-bold text-slate-800">Balance equation</h3><p className="text-[11px] text-slate-400">Assets versus liabilities + equity</p><div className="mt-5 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={equation} layout="vertical" margin={{ left: 8, right: 8 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => formatMoney(Number(value))} /><Bar dataKey="assets" stackId="a" fill="#10b981" /><Bar dataKey="liabilities" stackId="a" fill="#f43f5e" /><Bar dataKey="equity" stackId="a" fill="#6366f1" /></BarChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs"><div><span className="text-slate-400">Gross P&amp;L</span><p className="font-bold text-slate-700">{formatMoney(totals.grossPL)}</p></div><div><span className="text-slate-400">Net P&amp;L</span><p className="font-bold text-slate-700">{formatMoney(totals.netPL)}</p></div></div></div></div></section>;
}