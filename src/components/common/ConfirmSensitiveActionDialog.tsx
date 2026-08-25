"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ReasonType } from "@/lib/constants/reasonTypes";
import { listReasonOptions, type ReasonOption } from "@/services/reasonService";

type BaseProps = {
  title: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type FreeTextProps = BaseProps & {
  reasonType?: undefined;
  reason: string;
  onReasonChange: (reason: string) => void;
};

type MasterReasonProps = BaseProps & {
  reasonType: ReasonType;
  selectedReasonId: string;
  onReasonIdChange: (id: string) => void;
  remark: string;
  onRemarkChange: (remark: string) => void;
};

export type ConfirmSensitiveActionDialogProps = FreeTextProps | MasterReasonProps;

export function ConfirmSensitiveActionDialog(props: ConfirmSensitiveActionDialogProps) {
  const { title, open, onCancel, onConfirm } = props;

  const [options, setOptions] = useState<ReasonOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const masterProps = "reasonType" in props && props.reasonType != null ? (props as MasterReasonProps) : null;

  useEffect(() => {
    if (!open || !masterProps) return;
    const rt = masterProps.reasonType;
    let cancelled = false;
    setOptionsLoading(true);
    setOptionsError(null);
    void listReasonOptions(rt)
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setOptionsError("Could not load reasons.");
          setOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, masterProps?.reasonType]);

  if (!open) return null;

  const canConfirm = masterProps
    ? Boolean(masterProps.selectedReasonId.trim()) && !optionsLoading
    : Boolean((props as FreeTextProps).reason.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
      <div className="card w-full max-w-md space-y-4 p-4">
        <h3 className="text-lg font-semibold">{title}</h3>

        {masterProps ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason *</label>
              <Select
                placeholder={optionsLoading ? "Loading…" : "Select a reason"}
                value={masterProps.selectedReasonId}
                onChange={(e) => masterProps.onReasonIdChange(e.target.value)}
                disabled={optionsLoading || options.length === 0}
              >
                {!optionsLoading && options.length === 0 ? (
                  <option value="">No reasons available</option>
                ) : (
                  options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.reason}
                    </option>
                  ))
                )}
              </Select>
              {optionsError && <p className="mt-1 text-sm text-[var(--danger)]">{optionsError}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Additional note (optional)</label>
              <Input
                placeholder="Optional details"
                value={masterProps.remark}
                onChange={(e) => masterProps.onRemarkChange(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <Input
            placeholder="Reason (required)"
            value={(props as FreeTextProps).reason}
            onChange={(event) => (props as FreeTextProps).onReasonChange(event.target.value)}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!canConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
