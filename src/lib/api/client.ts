import { z } from "zod";

export const UNAUTHORIZED_EVENT = "clinicos:unauthorized";

type QueryValue = string | number | boolean | null | undefined;

type ApiRequestOptions<T> = Omit<RequestInit, "body"> & {
  body?: unknown;
  facilityId?: string;
  query?: Record<string, QueryValue>;
  schema?: z.ZodType<T>;
};

type ApiFailure = {
  error?: string;
  message?: string;
  success?: false;
};

export class ApiClientError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data ?? null;
  }
}

function dispatchUnauthorized() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function resolveErrorMessage(payload: ApiFailure | null, fallback: string) {
  return payload?.error || payload?.message || fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseResponsePayload(raw: string): ApiFailure | Record<string, unknown> | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ApiFailure | Record<string, unknown>;
  } catch {
    return null;
  }
}

export function requireFacilityId(facilityId?: string) {
  if (!facilityId) {
    throw new Error("Facility id is required for facility-scoped requests.");
  }

  return facilityId;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;

  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  if (options.facilityId) {
    headers.set("x-facility-id", options.facilityId);
  }

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    cache: options.cache ?? "no-store",
    headers,
  });

  const rawPayload = await response.text().catch(() => "");
  const payload = parseResponsePayload(rawPayload);

  if (response.status === 401) {
    dispatchUnauthorized();
  }

  if (!response.ok || payload?.success === false) {
    const fallback =
      response.statusText ||
      (rawPayload && !payload ? rawPayload.slice(0, 160) : "Request failed");

    throw new ApiClientError(
      resolveErrorMessage(payload as ApiFailure | null, fallback),
      response.status,
      payload ?? rawPayload,
    );
  }

  if (options.schema) {
    return options.schema.parse(payload);
  }

  return (payload ?? (isRecord(rawPayload) ? rawPayload : null)) as T;
}
