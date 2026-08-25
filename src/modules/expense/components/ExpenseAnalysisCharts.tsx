"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { useFormatMoney } from "@/hooks/useFormatMoney";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

interface ChartProps {
  data: Array<{
    expenseTypeId: string;
    name: string;
    totalAmount: number;
    count: number;
  }>;
}

const ChartWrapper = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
    <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-tighter mb-4 flex items-center gap-2">
       <span className="w-1.5 h-4 bg-brand-primary rounded-full" />
       {title}
    </h3>
    <div className="flex-grow w-full h-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  </Card>
);

export function ExpenseAnalysisCharts({ data }: ChartProps) {
  const { formatMoney } = useFormatMoney();
  const chartData = [...data].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10);
  
  const barData = chartData.map(item => ({
    name: item.name || "Unknown",
    amount: item.totalAmount,
    label: `${formatMoney(item.totalAmount / 1000, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}k`
  }));

  const pieData = chartData.map(item => ({
    name: item.name || "Unknown",
    value: item.count
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* 1. Category Spending Comparison */}
      <ChartWrapper title="Category Spending Comparison (Amount)">
        <BarChart
          data={barData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
            width={80}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              const safe = Number.isFinite(n) ? n : 0;
              return [formatMoney(safe), "Amount"];
            }}
          />
          <Bar
            dataKey="amount"
            radius={[0, 4, 4, 0]}
            barSize={18}
          >
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartWrapper>

      {/* 2. Volume Distribution */}
      <ChartWrapper title="Entry Volume Distribution (Count)">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="#fff"
            strokeWidth={2}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "10px",
              border: "none",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }}
          />
        </PieChart>
      </ChartWrapper>
    </div>
  );
}
