"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { formatAuditEntityOptionLabel } from "@/lib/auditEntitySelectLabel";
import { reportService } from "@/services/reportService";

export function AuditHistoryEntityFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [entities, setEntities] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    reportService
      .transactionHistoryEntities()
      .then((r) => {
        if (!cancelled && Array.isArray(r.data)) setEntities(r.data);
      })
      .catch(() => {
        if (!cancelled) setEntities([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-slate-500 uppercase tracking-tight">Entity</Label>
      <Select value={value || "__all__"} onValueChange={(v: string) => onChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="h-9 w-[min(100vw-2rem,220px)] text-sm bg-white border-slate-200">
          <SelectValue placeholder="All entities" />
        </SelectTrigger>
        <SelectContent className="">
          <SelectItem className="" value="__all__">
            All entities
          </SelectItem>
          {entities.map((e) => (
            <SelectItem className="" key={e} value={e}>
              {formatAuditEntityOptionLabel(e)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
