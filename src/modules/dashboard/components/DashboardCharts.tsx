"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { ModulePlaceholder } from "@/components/common/ModulePlaceholder";

interface ChartProps {
  filters: { status: string };
}

export function DashboardCharts({ filters }: ChartProps) {
  return (
    <div className="grid grid-cols-12 gap-4 mt-6">
      {/* Primary Analytics Chart */}
      <div className="col-span-12 lg:col-span-8">
        <Card className="h-full min-h-[400px] border-slate-200 shadow-sm">
          <div className="p-0 h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <h3 className="font-semibold text-slate-800 text-sm">
                Activity Trends
              </h3>
              <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                {filters.status === "all" ? "All Statuses" : filters.status}
              </span>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-white rounded-b-xl">
              <ModulePlaceholder
                title="Activity Chart"
                description="Visual representation of deposits, withdrawals, and metrics over time will appear here."
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary Distribution Chart */}
      <div className="col-span-12 lg:col-span-4">
        <Card className="h-full min-h-[400px] border-slate-200 shadow-sm">
          <div className="p-0 h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <h3 className="font-semibold text-slate-800 text-sm">
                Distribution
              </h3>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-white rounded-b-xl">
              <ModulePlaceholder
                title="Distribution Metrics"
                description="Pie chart or breakdown of P/L by provider or type."
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
