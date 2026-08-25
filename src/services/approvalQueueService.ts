import { apiClient } from "./apiClient";
import { getAccessToken } from "./sessionStore";

type ApprovalModule = "deposit" | "withdrawal";
type ApprovalView = "banker" | "exchange";

function endpointFor(module: ApprovalModule): string {
  return module === "deposit" ? "/deposit/approval-queue/events" : "/withdrawal/approval-queue/events";
}

export async function streamApprovalQueueEvents(
  module: ApprovalModule,
  view: ApprovalView,
  onPendingUpdate: () => void,
): Promise<() => void> {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access token for realtime updates");

  const controller = new AbortController();
  const response = await fetch(
    `${apiClient.defaults.baseURL}${endpointFor(module)}?view=${encodeURIComponent(view)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      credentials: "include",
    },
  );

  if (!response.ok || !response.body) {
    throw new Error("Unable to connect to approval queue stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const processChunk = (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n");
      let eventName = "message";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
      }
      if (eventName === "pending_update") onPendingUpdate();
    }
  };

  void (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }
    } catch {
      // Caller handles fallback polling.
    }
  })();

  return () => controller.abort();
}
