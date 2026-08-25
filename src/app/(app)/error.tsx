"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card space-y-3 p-6">
      <p className="font-semibold text-danger">Something went wrong.</p>
      <p className="text-sm text-text-secondary">{error.message}</p>
      <button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
