import { ApiUrl_for } from "./apiUrl";

export interface IApiRequest {
  method?: "GET" | "POST";
  token?: string;
  json?: unknown;
}

export type IApiSendResult =
  | { kind: "reply"; status: number; ok: boolean; body: unknown; bodyTimedOut: boolean }
  | { kind: "offline" }
  | { kind: "timeout" };

export function ApiRequest_fetch(path: string, request: IApiRequest, signal?: AbortSignal): Promise<Response> {
  const headers: Record<string, string> = {};
  if (request.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (request.token != null) {
    headers.Authorization = `Bearer ${request.token}`;
  }
  return fetch(ApiUrl_for(path), {
    method: request.method,
    headers,
    body: request.json !== undefined ? JSON.stringify(request.json) : undefined,
    signal,
  });
}

// A body that is not JSON comes back as undefined, since JSON itself can never parse to undefined.
export async function ApiRequest_send(path: string, request: IApiRequest, timeoutMs?: number): Promise<IApiSendResult> {
  const controller = timeoutMs != null ? new AbortController() : undefined;
  const timer = controller != null ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  const aborted = (): boolean => controller?.signal.aborted === true;
  try {
    let response: Response;
    try {
      response = await ApiRequest_fetch(path, request, controller?.signal);
    } catch {
      return { kind: aborted() ? "timeout" : "offline" };
    }
    const body: unknown = await response.json().catch(() => undefined);
    return {
      kind: "reply",
      status: response.status,
      ok: response.ok,
      body,
      bodyTimedOut: body === undefined && aborted(),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function ApiRequest_errorText(status: number, body: unknown): string {
  const error = (body as { error?: unknown } | undefined)?.error;
  return typeof error === "string" ? error : `The server returned ${status}.`;
}
