"use client";

import { useEffect, useRef } from "react";
import { streamApprovalQueueEvents } from "@/services/approvalQueueService";

type ApprovalModule = "deposit" | "withdrawal";
type ApprovalView = "banker" | "exchange";

type UseApprovalQueueAutoRefreshInput = {
  module: ApprovalModule;
  view: ApprovalView;
  onRefresh: () => void;
  pollMs?: number;
  debounceMs?: number;
};

export function useApprovalQueueAutoRefresh({
  module,
  view,
  onRefresh,
  pollMs = 12_000,
  debounceMs = 800,
}: UseApprovalQueueAutoRefreshInput) {
  const onRefreshRef = useRef(onRefresh);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const triggerRefresh = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onRefreshRef.current();
      }, debounceMs);
    };

    const stopFallbackPolling = () => {
      if (!fallbackPollRef.current) return;
      clearInterval(fallbackPollRef.current);
      fallbackPollRef.current = null;
    };

    const startFallbackPolling = () => {
      if (fallbackPollRef.current) return;
      fallbackPollRef.current = setInterval(() => {
        onRefreshRef.current();
      }, pollMs);
    };

    const connect = async () => {
      try {
        unsub = await streamApprovalQueueEvents(module, view, triggerRefresh);
        if (cancelled) {
          unsub();
          unsub = null;
          return;
        }
        stopFallbackPolling();
      } catch {
        if (!cancelled) startFallbackPolling();
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (unsub) unsub();
      stopFallbackPolling();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [module, view, pollMs, debounceMs]);
}
