"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconCheck, IconX } from "@tabler/icons-react";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { listExchangeLookupOptions, listPlayerLookupOptions } from "@/services/lookupService";
import {
  createPlayer,
  createPlayerImportJob,
  downloadPlayerImportJobErrorCsv,
  downloadSampleCsv,
  getPlayerImportJob,
  importPlayers,
  PlayerImportValidationCsvError,
  streamPlayerImportJobEvents,
} from "@/services/playerService";
import { formatImportErrorToast, getApiErrorMessage } from "@/lib/apiError";
import type { PlayerImportJobSummary, PlayerUserType } from "@/types/player";

export function PlayerAddClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadedErrorCsvJobsRef = useRef<Set<string>>(new Set());

  const [exchangeId, setExchangeId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<PlayerUserType>("trader");
  const [referredByPlayerId, setReferredByPlayerId] = useState("");
  const [referralPercentage, setReferralPercentage] = useState("0");
  const [manualErrors, setManualErrors] = useState<{
    exchangeId?: string;
    playerId?: string;
    phone?: string;
    email?: string;
    userType?: string;
    referralPercentage?: string;
  }>({});
  const [manualLoading, setManualLoading] = useState(false);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [importJob, setImportJob] = useState<PlayerImportJobSummary | null>(null);

  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) streamCleanupRef.current();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const loadExchangeOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = await listExchangeLookupOptions({ q: query || undefined, limit: 25 });
      return rows.map((ex) => ({
        value: ex.id,
        label: `${ex.name} (${ex.provider})`,
      }));
    } catch {
      return [];
    }
  }, []);

  const resetManual = () => {
    setExchangeId("");
    setPlayerId("");
    setPhone("");
    setEmail("");
    setUserType("trader");
    setReferredByPlayerId("");
    setReferralPercentage("0");
    setManualErrors({});
  };

  const loadPlayerOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = await listPlayerLookupOptions({ q: query || undefined, limit: 10, userType: "ib" });
      return rows.map((player) => ({
        value: player.id,
        label: `${player.playerId} · ${player.phone} · ${player.exchangeName}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const triggerCsvDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onManualSave = async () => {
    const next: typeof manualErrors = {};
    if (!exchangeId.trim()) next.exchangeId = "Exchange is required.";
    if (!playerId.trim()) next.playerId = "Trader Id is required.";
    if (!phone.trim()) next.phone = "Phone number is required.";
    const emailTrim = email.trim();
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      next.email = "Enter a valid email address.";
    }
    if (userType !== "trader" && userType !== "ib") {
      next.userType = "User type is required.";
    }
    const referralPctNum = Number(referralPercentage);
    if (referralPercentage.trim() === "" || Number.isNaN(referralPctNum)) {
      next.referralPercentage = "Referral percentage is required.";
    } else if (referralPctNum < 0 || referralPctNum > 100) {
      next.referralPercentage = "Referral percentage must be between 0 and 100.";
    }
    setManualErrors(next);
    if (Object.keys(next).length > 0) return;

    setManualLoading(true);
    try {
      await createPlayer({
        exchangeId: exchangeId.trim(),
        playerId: playerId.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        userType,
        regularBonusPercentage: 0,
        firstDepositBonusPercentage: 0,
        referredByPlayerId: referredByPlayerId || null,
        referralPercentage: referralPctNum,
      });
      toast.success("Trader saved successfully.");
      resetManual();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save trader"));
    } finally {
      setManualLoading(false);
    }
  };

  const onBulkSave = async () => {
    if (!bulkFile) {
      toast.error("Choose a CSV or Excel file.");
      return;
    }
    setBulkLoading(true);
    const asyncImportEnabled = process.env.NEXT_PUBLIC_PLAYER_IMPORT_ASYNC_ENABLED !== "false";
    let cleanupStream: (() => void) | null = null;
    let pollingTimer: ReturnType<typeof setInterval> | null = null;
    const stopAllTracking = () => {
      if (cleanupStream) cleanupStream();
      if (pollingTimer) clearInterval(pollingTimer);
      streamCleanupRef.current = null;
      pollTimerRef.current = null;
    };
    try {
      if (!asyncImportEnabled) {
        const result = await importPlayers(bulkFile);
        const parts = [
          `Created ${result.created} trader${result.created === 1 ? "" : "s"}.`,
          `Updated ${result.updated} trader${result.updated === 1 ? "" : "s"}.`,
        ];
        if (result.skipped > 0) {
          parts.push(`${result.skipped} empty row${result.skipped === 1 ? "" : "s"} skipped.`);
        }
        toast.success(parts.join(" "));
        setBulkFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const queued = await createPlayerImportJob(bulkFile);
      toast.success("Import accepted. Processing started in background.");
      const initial = await getPlayerImportJob(queued.jobId);
      setImportJob(initial);
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const refreshStatus = async () => {
        try {
          const next = await getPlayerImportJob(queued.jobId);
          setImportJob(next);
          if (next.status === "completed") {
            stopAllTracking();
            toast.success(
              `Import completed. Processed ${next.progress.processedRows}/${next.progress.totalRows} rows.`,
            );
          } else if (next.status === "failed") {
            stopAllTracking();
            if (next.errorCsvAvailable && !downloadedErrorCsvJobsRef.current.has(next.id)) {
              downloadedErrorCsvJobsRef.current.add(next.id);
              try {
                const { blob, fileName } = await downloadPlayerImportJobErrorCsv(next.id);
                triggerCsvDownload(blob, fileName);
                toast.error(next.failureReason ?? "Import failed.", {
                  description: "Validation errors were downloaded as a CSV file.",
                });
                return;
              } catch {
                // Fallback to standard failure toast below.
              }
            }
            toast.error(next.failureReason ?? "Import failed.");
          }
        } catch {
          // Keep polling retries silent.
        }
      };

      cleanupStream = await streamPlayerImportJobEvents(queued.jobId, (streamed) => {
        setImportJob((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: streamed.status,
            failureReason: streamed.failureReason,
            progress: streamed.progress,
          };
        });
      });
      streamCleanupRef.current = cleanupStream;

      pollingTimer = setInterval(() => {
        void refreshStatus();
      }, 7000);
      pollTimerRef.current = pollingTimer;

      void refreshStatus();
    } catch (error: unknown) {
      if (error instanceof PlayerImportValidationCsvError) {
        triggerCsvDownload(error.blob, error.fileName);
        toast.error("Import failed.", { description: "Validation errors were downloaded as a CSV file." });
        return;
      }
      const { title, description } = formatImportErrorToast(error, "Import failed");
      if (description) {
        toast.error(title, { description });
      } else {
        toast.error(title);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const onDownloadSample = async () => {
    try {
      const blob = await downloadSampleCsv();
      triggerCsvDownload(blob, "players-sample.csv");
      toast.success("Sample CSV downloaded.");
    } catch {
      toast.error("Failed to download sample CSV.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pb-4">
      <FormContainer
        title="Add Exchange Trader"
        description="Register a single trader against an exchange."
        contentOverflow="visible"
        className="flex-none"
      >
        <FormGrid>
          <div>
            <FieldLabel>Exchange *</FieldLabel>
            <AutocompleteField
              value={exchangeId}
              onChange={setExchangeId}
              loadOptions={loadExchangeOptions}
              placeholder="search..."
            />
            <FieldError message={manualErrors.exchangeId} />
          </div>
          <div>
            <FieldLabel>Trader Id *</FieldLabel>
            <Input placeholder="id" value={playerId} onChange={(e) => setPlayerId(e.target.value)} />
            <FieldError message={manualErrors.playerId} />
          </div>
          <div>
            <FieldLabel>Phone Number *</FieldLabel>
            <Input
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <FieldError message={manualErrors.phone} />
          </div>
          <div>
            <FieldLabel>Email ID</FieldLabel>
            <Input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email ID"
            />
            <FieldError message={manualErrors.email} />
          </div>
          <div>
            <FieldLabel>User type *</FieldLabel>
            <select
              className="h-9 w-full rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
              value={userType}
              onChange={(e) => setUserType(e.target.value === "ib" ? "ib" : "trader")}
              aria-label="User type"
            >
              <option value="trader">Trader</option>
              <option value="ib">IB</option>
            </select>
            <FieldError message={manualErrors.userType} />
          </div>
          <div>
            <FieldLabel>IB</FieldLabel>
            <AutocompleteField
              value={referredByPlayerId}
              onChange={setReferredByPlayerId}
              loadOptions={loadPlayerOptions}
              autoSelectSingleOption
              placeholder="search IB..."
            />
          </div>
          <div>
            <FieldLabel>Referral Percentage for IB *</FieldLabel>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="0"
              value={referralPercentage}
              onChange={(e) => {
                setReferralPercentage(e.target.value);
                setManualErrors((prev) => {
                  if (!prev.referralPercentage) return prev;
                  const next = { ...prev };
                  delete next.referralPercentage;
                  return next;
                });
              }}
            />
            <FieldError message={manualErrors.referralPercentage} />
          </div>
        </FormGrid>
        <FormActions className="justify-between px-5 py-4">
          <Button
            type="button"
            loading={manualLoading}
            startIcon={<IconCheck size={18} />}
            onClick={onManualSave}
          >
            Save
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            startIcon={<IconX size={18} />} 
            onClick={resetManual} 
            disabled={manualLoading}
          >
            Cancel
          </Button>
        </FormActions>
      </FormContainer>

      <FormContainer
        title="Bulk upload"
        description="Upload a CSV or Excel file. Each row must include exchange name, player id (trader id), and phone. Optional user_type is trader or ib (defaults to trader). Bonus percentage columns are optional and default to 0. Use the sample file as a template. If any row is invalid, nothing is imported."
        className="flex-none"
      >
        <div className="space-y-2">
          <div>
            <FieldLabel>Trader file (CSV or Excel) *</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-md file:border file:border-[var(--border)] file:bg-white file:px-3 file:py-1.5"
              onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={onDownloadSample}
              className="mt-2 h-auto p-0"
            >
              Download sample CSV
            </Button>
          </div>
        </div>
        <FormActions className="justify-between px-5 py-3">
          <Button
            type="button"
            loading={bulkLoading}
            startIcon={<IconCheck size={18} />}
            onClick={onBulkSave}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            startIcon={<IconX size={18} />}
            onClick={() => {
              setBulkFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            disabled={bulkLoading}
          >
            Cancel
          </Button>
        </FormActions>
        {importJob ? (
          <div className="border-border mt-3 rounded-md border p-3 text-sm">
            <div className="font-medium">Import status: {importJob.status}</div>
            <div className="text-[var(--text-secondary)]">
              Processed {importJob.progress.processedRows}/{importJob.progress.totalRows} rows
            </div>
            <div className="text-[var(--text-secondary)]">
              Success: {importJob.progress.successRows} | Failed: {importJob.progress.failedRows} | Skipped:{" "}
              {importJob.progress.skippedRows}
            </div>
            {importJob.failureReason ? <div className="mt-1 text-red-600">{importJob.failureReason}</div> : null}
          </div>
        ) : null}
      </FormContainer>
    </div>
  );
}
