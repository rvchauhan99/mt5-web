"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/common/FieldLabel";
import {
  IconUpload,
  IconDownload,
  IconFileCheck,
  IconAlertTriangle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import {
  createDepositImportJob,
  downloadDepositImportJobErrorCsv,
  downloadDepositImportSample,
  getDepositImportJob,
  streamDepositImportJobEvents,
  validateDepositImport,
  type DepositImportInvalidRow,
  type DepositImportValidationResult,
} from "@/services/depositService";
import type { DepositImportJobSummary } from "@/types/deposit";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";

type Step = "upload" | "review" | "result";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DepositImportDialog({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<DepositImportValidationResult | null>(null);
  const [commitResult, setCommitResult] = useState<{ created: number; errors: Array<{ row: number; utr: string; error: string }> } | null>(null);
  const [importJob, setImportJob] = useState<DepositImportJobSummary | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadedErrorCsvJobsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) streamCleanupRef.current();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (!open) return null;

  function reset() {
    setStep("upload");
    setFile(null);
    setValidating(false);
    setCommitting(false);
    setValidationResult(null);
    setCommitResult(null);
    setImportJob(null);
    setError("");
    if (streamCleanupRef.current) streamCleanupRef.current();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    streamCleanupRef.current = null;
    pollTimerRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleDownloadSample(format: "csv" | "xlsx") {
    try {
      const blob = await downloadDepositImportSample(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "xlsx" ? "deposit-import-sample.xlsx" : "deposit-import-sample.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        format === "xlsx" ? "Excel template downloaded." : "CSV template downloaded.",
      );
    } catch {
      toast.error("Failed to download sample file");
    }
  }

  async function handleValidate() {
    if (!file) return;
    setError("");
    setValidating(true);
    try {
      const result = await validateDepositImport(file);
      setValidationResult(result);
      setStep("review");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Validation failed"));
    } finally {
      setValidating(false);
    }
  }

  async function handleCommit() {
    if (!validationResult || validationResult.validRows.length === 0) return;
    setCommitting(true);
    setError("");
    const stopAllTracking = () => {
      if (streamCleanupRef.current) streamCleanupRef.current();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      streamCleanupRef.current = null;
      pollTimerRef.current = null;
    };
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
    try {
      const rows = validationResult.validRows.map((r) => ({
        utr: r.utr,
        amount: r.amount,
        entryAt: r.entryAt,
        settlementAccountType: r.settlementAccountType,
        bankId: r.bankId,
        liabilityPersonId: r.liabilityPersonId,
        playerMongoId: r.playerMongoId,
        bonusAmount: 0,
        totalAmount: r.amount,
      }));
      const queued = await createDepositImportJob(rows);
      const initial = await getDepositImportJob(queued.jobId);
      setImportJob(initial);
      setStep("result");

      const refreshStatus = async () => {
        try {
          const next = await getDepositImportJob(queued.jobId);
          setImportJob(next);
          if (next.status === "completed") {
            stopAllTracking();
            const result = {
              created: next.progress.successRows,
              errors: next.errorSample,
            };
            setCommitResult(result);
            if (next.progress.successRows > 0) onSuccess();
          } else if (next.status === "failed") {
            stopAllTracking();
            const result = {
              created: next.progress.successRows,
              errors: next.errorSample,
            };
            setCommitResult(result);
            if (next.errorCsvAvailable && !downloadedErrorCsvJobsRef.current.has(next.id)) {
              downloadedErrorCsvJobsRef.current.add(next.id);
              try {
                const { blob, fileName } = await downloadDepositImportJobErrorCsv(next.id);
                triggerCsvDownload(blob, fileName);
              } catch {
                // Ignore download failure.
              }
            }
          }
        } catch {
          // Keep polling retries silent.
        }
      };

      const cleanupStream = await streamDepositImportJobEvents(queued.jobId, (streamed) => {
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
      pollTimerRef.current = setInterval(() => {
        void refreshStatus();
      }, 7000);

      void refreshStatus();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Import failed"));
    } finally {
      setCommitting(false);
    }
  }

  function handleDownloadErrors(invalidRows: DepositImportInvalidRow[]) {
    const header =
      "Row,Date Time,Settlement Type,Bank,Liable Person Name,Trader Id,Reference Number,Amount,Error";
    const lines = [header];
    for (const r of invalidRows) {
      lines.push(
        [
          String(r.row),
          csvQuote(r.dateTime),
          csvQuote(r.settlementType),
          csvQuote(r.bankAccountNumber),
          csvQuote(r.liablePersonName),
          csvQuote(r.playerId),
          csvQuote(r.utr),
          csvQuote(r.amount),
          csvQuote(r.errors.join("; ")),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deposit-import-errors-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="card w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Import Deposits</h3>
            <p className="text-sm text-gray-500">
              {step === "upload" && "Upload a CSV or Excel file to bulk import deposits"}
              {step === "review" && "Review validation results before importing"}
              {step === "result" && "Import complete"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "upload" && <UploadStep
            file={file}
            fileInputRef={fileInputRef}
            onFileChange={setFile}
            onDownloadSample={handleDownloadSample}
          />}

          {step === "review" && validationResult && <ReviewStep
            result={validationResult}
            onDownloadErrors={handleDownloadErrors}
          />}

          {step === "result" && <ResultStep result={commitResult} importJob={importJob} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          {step === "upload" && (
            <>
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleValidate}
                loading={validating}
                disabled={!file || validating}
                startIcon={<IconFileCheck size={16} />}
              >
                Validate
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => { reset(); }}>
                Upload Different File
              </Button>
              <Button
                size="sm"
                onClick={handleCommit}
                loading={committing}
                disabled={committing || !validationResult || validationResult.validRows.length === 0}
                startIcon={<IconUpload size={16} />}
              >
                Confirm Import ({validationResult?.validRows.length ?? 0} records)
              </Button>
            </>
          )}

          {step === "result" && (
            <Button size="sm" onClick={handleClose}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadStep({
  file,
  fileInputRef,
  onFileChange,
  onDownloadSample,
}: {
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (f: File | null) => void;
  onDownloadSample: (format: "csv" | "xlsx") => void;
}) {
  return (
    <div className="space-y-5">
      {/* Step 1: Download Template */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">Step 1: Download a template</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Fill in deposit data using CSV or Excel, then upload below
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDownloadSample("csv")}
              startIcon={<IconDownload size={16} />}
            >
              Download CSV Template
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDownloadSample("xlsx")}
              startIcon={<IconDownload size={16} />}
            >
              Download Excel Template
            </Button>
          </div>
        </div>
      </div>

      {/* Step 2: Upload File */}
      <div>
        <FieldLabel>Step 2: Upload Filled CSV or Excel File</FieldLabel>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        {file && (
          <p className="mt-2 text-sm text-gray-500">
            Selected: <span className="font-medium text-gray-700">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Column guide:</p>
        <div className="text-xs text-gray-600 space-y-1">
          <p><span className="font-medium">Date Time</span> — DD/MM/YYYY HH:mm or DD/MM/YY HH:mm in your profile timezone (optional, defaults to current). Excel formats (seconds, AM/PM) are accepted; leave blank to use current time.</p>
          <p><span className="font-medium">Settlement Type</span> — Bank or Person (optional, defaults to Bank)</p>
          <p><span className="font-medium">Bank</span> — Account Number or Holder Name (required if settlement is Bank)</p>
          <p><span className="font-medium">Liable Person Name</span> — Required if settlement is Person</p>
          <p><span className="font-medium">Trader Id</span> — Exchange trader code (optional)</p>
          <p><span className="font-medium">Reference Number</span> — Required, must be unique (4-120 chars)</p>
          <p><span className="font-medium">Amount</span> — Required, whole number, min 1.</p>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  result,
  onDownloadErrors,
}: {
  result: DepositImportValidationResult;
  onDownloadErrors: (rows: DepositImportInvalidRow[]) => void;
}) {
  const { summary, validRows, invalidRows } = result;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Total Rows" value={summary.total} color="gray" />
        <SummaryCard label="Valid" value={summary.valid} color="green" />
        <SummaryCard label="Invalid" value={summary.invalid} color="red" />
        <SummaryCard label="Skipped" value={summary.skipped} color="yellow" />
      </div>

      {/* Invalid rows */}
      {invalidRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconAlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-700">
                Invalid Records ({invalidRows.length})
              </span>
            </div>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => onDownloadErrors(invalidRows)}
              startIcon={<IconDownload size={14} />}
            >
              Download Invalid CSV
            </Button>
          </div>
          <div className="max-h-48 overflow-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-red-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-red-800">Row</th>
                  <th className="px-3 py-2 text-left font-medium text-red-800">Trader Id</th>
                  <th className="px-3 py-2 text-left font-medium text-red-800">Reference Number</th>
                  <th className="px-3 py-2 text-left font-medium text-red-800">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-red-800">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {invalidRows.map((r, i) => (
                  <tr key={i} className="bg-white hover:bg-red-50/50">
                    <td className="px-3 py-2 text-gray-600">{r.row}</td>
                    <td className="px-3 py-2 text-gray-700">{r.playerId || "—"}</td>
                    <td className="px-3 py-2 font-mono text-gray-700">{r.utr || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{r.amount || "—"}</td>
                    <td className="px-3 py-2 text-red-600">{r.errors.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Valid rows preview */}
      {validRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <IconCheck size={16} className="text-green-500" />
            <span className="text-sm font-medium text-green-700">
              Valid Records ({validRows.length})
              {validRows.length > 10 && <span className="font-normal text-gray-500"> — showing first 10</span>}
            </span>
          </div>
          <div className="max-h-48 overflow-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-green-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-green-800">Row</th>
                  <th className="px-3 py-2 text-left font-medium text-green-800">Trader Id</th>
                  <th className="px-3 py-2 text-left font-medium text-green-800">Reference Number</th>
                  <th className="px-3 py-2 text-left font-medium text-green-800">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {validRows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="bg-white hover:bg-green-50/50">
                    <td className="px-3 py-2 text-gray-600">{r.row}</td>
                    <td className="px-3 py-2 text-gray-700">{r.playerIdLabel || "—"}</td>
                    <td className="px-3 py-2 font-mono text-gray-700">{r.utr}</td>
                    <td className="px-3 py-2 text-gray-700">{r.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {validRows.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No valid records found. Please fix the errors and try again.
        </div>
      )}
    </div>
  );
}

function ResultStep({
  result,
  importJob,
}: {
  result: { created: number; errors: Array<{ row: number; utr: string; error: string }> } | null;
  importJob: DepositImportJobSummary | null;
}) {
  return (
    <div className="space-y-4">
      {importJob && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="font-medium capitalize">Status: {importJob.status}</p>
          <p className="mt-1">
            Processed {importJob.progress.processedRows}/{importJob.progress.totalRows} rows
          </p>
          <p className="mt-1">
            Success: {importJob.progress.successRows} | Failed: {importJob.progress.failedRows}
          </p>
          {importJob.failureReason ? <p className="mt-1 text-red-600">{importJob.failureReason}</p> : null}
        </div>
      )}
      {!result && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
          <p className="font-medium text-blue-800">Import is being processed in background</p>
          <p className="mt-1 text-sm text-blue-600">Please keep this dialog open to see live progress.</p>
        </div>
      )}
      {result ? <ResultContent result={result} /> : null}
    </div>
  );
}

function ResultContent({ result }: { result: { created: number; errors: Array<{ row: number; utr: string; error: string }> } }) {
  return (
    <div className="space-y-4">
      {result.created > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4">
          <IconCheck size={20} className="mt-0.5 text-green-600 shrink-0" />
          <div>
            <p className="font-medium text-green-800">
              Successfully imported {result.created} deposit{result.created !== 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-sm text-green-600">
              All records have been created with &quot;Pending&quot; status and are awaiting exchange approval.
            </p>
          </div>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <IconAlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm font-medium text-amber-700">
              {result.errors.length} record{result.errors.length !== 1 ? "s" : ""} failed during import
            </span>
          </div>
          <div className="max-h-40 overflow-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-amber-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-amber-800">#</th>
                  <th className="px-3 py-2 text-left font-medium text-amber-800">Reference Number</th>
                  <th className="px-3 py-2 text-left font-medium text-amber-800">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {result.errors.map((e, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2 text-gray-600">{e.row}</td>
                    <td className="px-3 py-2 font-mono text-gray-700">{e.utr}</td>
                    <td className="px-3 py-2 text-amber-700">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.created === 0 && result.errors.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No records were imported.
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: "gray" | "green" | "red" | "yellow" }) {
  const colorMap = {
    gray: "border-gray-200 bg-gray-50 text-gray-900",
    green: "border-green-200 bg-green-50 text-green-700",
    red: "border-red-200 bg-red-50 text-red-700",
    yellow: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-lg border p-3 text-center ${colorMap[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function csvQuote(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
