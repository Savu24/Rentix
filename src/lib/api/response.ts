import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Jednolity kształt odpowiedzi REST.
 *
 * Sukces zwraca zasób wprost (`{ id, name, ... }`), błąd zawsze kopertę
 * `{ error: { code, message, fields? } }`. Dzięki temu przyszły klient mobilny
 * ma jeden parser błędów dla całego API i rozpoznaje przyczynę po `code`,
 * a nie po tekście komunikatu.
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Błędy per pole formularza: { email: ["Ten adres jest już zajęty"] } */
    fields?: Record<string, string[]>;
  };
};

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function ok<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  options?: { fields?: Record<string, string[]>; headers?: HeadersInit },
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(options?.fields ? { fields: options.fields } : {}) } },
    { status: STATUS_BY_CODE[code], headers: options?.headers },
  );
}

/** Zamienia błąd Zoda na mapę `pole → komunikaty`, gotową dla formularza. */
export function fieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export function validationError(error: ZodError): NextResponse<ApiErrorBody> {
  return apiError("VALIDATION_ERROR", "Popraw zaznaczone pola.", {
    fields: fieldErrors(error),
  });
}

export function rateLimited(retryAfterSeconds: number): NextResponse<ApiErrorBody> {
  return apiError("RATE_LIMITED", "Zbyt wiele prób. Spróbuj ponownie za chwilę.", {
    headers: { "Retry-After": String(retryAfterSeconds) },
  });
}
