"use client";

import { useEffect, useMemo, useState, useCallback, type KeyboardEvent } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import type { BalanceSheetGroupNode, BalanceSheetLedger } from "@/types/balanceSheet";

interface BalanceSheetTreeProps {
  title: string;
  nodes: BalanceSheetGroupNode[];
  showCompare: boolean;
  showMovementColumns?: boolean;
  compactDensity?: boolean;
  expandAllToken?: number;
  onLedgerClick: (ledger: BalanceSheetLedger) => void;
  accent?: "emerald" | "rose" | "indigo";
}

type FlatRow =
  | { kind: "group"; node: BalanceSheetGroupNode; depth: number }
  | { kind: "ledger"; ledger: BalanceSheetLedger; depth: number; groupCode: string };

function collectDefaultExpanded(nodes: BalanceSheetGroupNode[]): Set<string> {
  const set = new Set<string>();
  const walk = (list: BalanceSheetGroupNode[]) => {
    for (const n of list) {
      if (n.level <= 0) set.add(n.groupId);
      walk(n.subGroups);
    }
  };
  walk(nodes);
  return set;
}

function collectAllGroupIds(nodes: BalanceSheetGroupNode[]): Set<string> {
  const all = new Set<string>();
  const walk = (list: BalanceSheetGroupNode[]) => {
    for (const n of list) {
      all.add(n.groupId);
      walk(n.subGroups);
    }
  };
  walk(nodes);
  return all;
}

function flattenVisible(
  nodes: BalanceSheetGroupNode[],
  expanded: Set<string>,
  depth = 0,
): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const node of nodes) {
    rows.push({ kind: "group", node, depth });
    if (!expanded.has(node.groupId)) continue;
    for (const ledger of node.ledgers) {
      rows.push({ kind: "ledger", ledger, depth: depth + 1, groupCode: node.code });
    }
    rows.push(...flattenVisible(node.subGroups, expanded, depth + 1));
  }
  return rows;
}

export function BalanceSheetTree({
  title,
  nodes,
  showCompare,
  showMovementColumns = false,
  compactDensity = false,
  expandAllToken = 0,
  onLedgerClick,
  accent = "emerald",
}: BalanceSheetTreeProps) {
  const { formatMoney } = useFormatMoney();
  const [expanded, setExpanded] = useState<Set<string>>(() => collectDefaultExpanded(nodes));

  useEffect(() => {
    setExpanded(collectDefaultExpanded(nodes));
  }, [nodes]);

  useEffect(() => {
    if (expandAllToken > 0) {
      setExpanded(collectAllGroupIds(nodes));
    }
  }, [expandAllToken, nodes]);

  const rows = useMemo(() => flattenVisible(nodes, expanded), [nodes, expanded]);

  const handleToggle = useCallback((groupId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleExpandAll = () => setExpanded(collectAllGroupIds(nodes));
  const handleCollapseAll = () => setExpanded(new Set());

  const handleGroupKeyDown = (e: KeyboardEvent, groupId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle(groupId);
    }
  };

  const sectionTotal = nodes.reduce((s, n) => s + n.total, 0);
  const cellPad = compactDensity ? "py-1.5" : "py-2.5";
  const baseColSpan =
    2 + (showMovementColumns ? 3 : 0) + (showCompare ? 2 : 0) + (compactDensity ? 0 : 1);
  const accentClass = { emerald: "text-emerald-700", rose: "text-rose-700", indigo: "text-indigo-700" }[accent];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden print:shadow-none print:break-inside-avoid">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 no-print">
        <div>
          <h2 className={cn("text-sm font-bold", accentClass)}>{title}</h2>
          <p className="text-[11px] text-slate-500 font-medium tabular-nums">
            Total {formatMoney(sectionTotal)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExpandAll}
            className="text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800 px-2 py-1"
            aria-label={`Expand all ${title} groups`}
          >
            Expand
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800 px-2 py-1"
            aria-label={`Collapse all ${title} groups`}
          >
            Collapse
          </button>
        </div>
      </div>

      <div
        className="max-h-[520px] overflow-auto print:max-h-none print:overflow-visible"
        aria-label={title}
      >
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-white border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 print:static">
            <tr>
              <th className="py-2 px-4 font-semibold">Particulars</th>
              {showMovementColumns && (
                <>
                  <th className="py-2 px-3 font-semibold text-right w-[100px]">Opening</th>
                  <th className="py-2 px-3 font-semibold text-right w-[100px]">Debit</th>
                  <th className="py-2 px-3 font-semibold text-right w-[100px]">Credit</th>
                </>
              )}
              <th className="py-2 px-3 font-semibold text-right w-[120px]">Closing</th>
              {showCompare && (
                <>
                  <th className="py-2 px-3 font-semibold text-right w-[110px]">Compare</th>
                  <th className="py-2 px-3 font-semibold text-right w-[100px]">Delta</th>
                </>
              )}
              {!compactDensity && (
                <th className="py-2 px-3 font-semibold text-center w-[56px] print:hidden">
                  Side
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 && (
              <tr>
                <td colSpan={baseColSpan} className="py-8 text-center text-slate-400 font-medium">
                  No balances in this section
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              if (row.kind === "group") {
                const isOpen = expanded.has(row.node.groupId);
                const hasChildren =
                  row.node.subGroups.length > 0 || row.node.ledgers.length > 0;
                return (
                  <tr
                    key={`g-${row.node.groupId}`}
                    className="bg-slate-50/60 hover:bg-slate-50/80 cursor-pointer print:break-inside-avoid"
                    onClick={() => hasChildren && handleToggle(row.node.groupId)}
                    onKeyDown={(e) => hasChildren && handleGroupKeyDown(e, row.node.groupId)}
                    tabIndex={hasChildren ? 0 : undefined}
                    aria-expanded={hasChildren ? isOpen : undefined}
                    aria-label={`${row.node.name} ${formatMoney(row.node.total)}`}
                  >
                    <td className={cn(cellPad, "px-4")}>
                      <div
                        className="flex items-center gap-1.5 font-semibold text-slate-800"
                        style={{ paddingLeft: row.depth * 16 }}
                      >
                        {hasChildren ? (
                          isOpen ? (
                            <IconChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                          ) : (
                            <IconChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                          )
                        ) : (
                          <span className="inline-block w-3.5" />
                        )}
                        {row.node.name}
                      </div>
                    </td>
                    {showMovementColumns && (
                      <>
                        <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-400")}>
                          —
                        </td>
                        <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-400")}>
                          —
                        </td>
                        <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-400")}>
                          —
                        </td>
                      </>
                    )}
                    <td
                      className={cn(
                        cellPad,
                        "px-3 text-right font-bold tabular-nums text-slate-900",
                      )}
                    >
                      {formatMoney(row.node.total)}
                    </td>
                    {showCompare && (
                      <>
                        <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-500")}>
                          {row.node.compareTotal != null
                            ? formatMoney(row.node.compareTotal)
                            : "—"}
                        </td>
                        <td
                          className={cn(
                            cellPad,
                            "px-3 text-right tabular-nums font-semibold",
                            (row.node.compareDelta ?? 0) >= 0
                              ? "text-emerald-600"
                              : "text-rose-600",
                          )}
                        >
                          {row.node.compareDelta != null
                            ? formatMoney(row.node.compareDelta)
                            : "—"}
                        </td>
                      </>
                    )}
                    {!compactDensity && (
                      <td className={cn(cellPad, "px-3 text-center print:hidden")}>
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-widest",
                            row.node.side === "asset" ? "text-emerald-600" : "text-rose-600",
                          )}
                        >
                          {row.node.side === "asset" ? "Dr" : "Cr"}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              }

              return (
                <tr
                  key={`l-${row.groupCode}-${row.ledger.ledgerId}`}
                  className={cn("cursor-pointer print:break-inside-avoid", index % 2 ? "bg-slate-50/40" : "", "hover:bg-brand-primary/5")}
                  onClick={() => onLedgerClick(row.ledger)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onLedgerClick(row.ledger);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`${row.ledger.name} ledger`}
                >
                  <td className={cn(cellPad, "px-4")}>
                    <div
                      className="text-slate-600 font-medium"
                      style={{ paddingLeft: row.depth * 16 + 18 }}
                    >
                      {row.ledger.name}
                    </div>
                  </td>
                  {showMovementColumns && (
                    <>
                      <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-500")}>
                        {formatMoney(row.ledger.openingBalance)}
                      </td>
                      <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-500")}>
                        {formatMoney(row.ledger.periodDebits)}
                      </td>
                      <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-500")}>
                        {formatMoney(row.ledger.periodCredits)}
                      </td>
                    </>
                  )}
                  <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-700")}>
                    {formatMoney(row.ledger.closingBalance)}
                  </td>
                  {showCompare && (
                    <>
                      <td className={cn(cellPad, "px-3 text-right tabular-nums text-slate-400")}>
                        {row.ledger.compareClosingBalance != null
                          ? formatMoney(row.ledger.compareClosingBalance)
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          cellPad,
                          "px-3 text-right tabular-nums",
                          (row.ledger.compareDelta ?? 0) >= 0
                            ? "text-emerald-600"
                            : "text-rose-600",
                        )}
                      >
                        {row.ledger.compareDelta != null
                          ? formatMoney(row.ledger.compareDelta)
                          : "—"}
                      </td>
                    </>
                  )}
                  {!compactDensity && (
                    <td className={cn(cellPad, "px-3 text-center print:hidden")}>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {row.ledger.side === "asset" ? "Dr" : "Cr"}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
