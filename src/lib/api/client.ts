import type { ApiErrorBody } from "./response";

/**
 * Klient REST dla komponentów przeglądarki.
 *
 * Jedno miejsce, które zna kształt kopert błędów z `response.ts`, więc żaden
 * formularz nie parsuje odpowiedzi ręcznie. Ten sam kontrakt skonsumuje
 * później aplikacja mobilna — stąd zwykły `fetch`, bez zależności od Next.
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: ApiErrorBody["error"]["code"] | "NETWORK_ERROR";
      message: string;
      fields?: Record<string, string[]>;
    };

/*
  Teksty błędów transportu — jedyne, których nie pisze serwer.

  Ta warstwa żyje poza Reactem i jest wołana z komponentów obu wersji
  krajowych, więc słownika nie da się jej wstrzyknąć propsem. `I18nProvider`
  wsuwa je tu przy montowaniu; wartości poniżej są tylko oknem na pierwszy
  render, zanim to nastąpi.
*/
const transportMessages = {
  network: "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.",
  unknown: "Coś poszło nie tak. Spróbuj ponownie.",
};

export function setTransportMessages(messages: { network: string; unknown: string }): void {
  transportMessages.network = messages.network;
  transportMessages.unknown = messages.unknown;
}

async function request<T>(
  input: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = init;

  let response: Response;
  try {
    response = await fetch(input, {
      ...rest,
      headers: json ? { "Content-Type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: transportMessages.network,
    };
  }

  if (response.status === 204) return { ok: true, data: undefined as T };

  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    return {
      ok: false,
      code: error?.code ?? "INTERNAL_ERROR",
      message: error?.message ?? transportMessages.unknown,
      fields: error?.fields,
    };
  }

  return { ok: true, data: body as T };
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: "GET" }),
  post: <T>(url: string, json: unknown) => request<T>(url, { method: "POST", json }),
  /** Podmiana całego zasobu pod znanym adresem — powtórzone żądanie daje ten sam stan. */
  put: <T>(url: string, json: unknown) => request<T>(url, { method: "PUT", json }),
  patch: <T>(url: string, json: unknown) => request<T>(url, { method: "PATCH", json }),
  /**
   * DELETE z opcjonalnym ciałem — potrzebne tam, gdzie usunięcie wymaga
   * potwierdzenia (hasło przy kasowaniu konta). HTTP na to pozwala, a
   * przenoszenie hasła do query stringa wpisywałoby je w logi serwera.
   */
  delete: <T>(url: string, json?: unknown) =>
    request<T>(url, json === undefined ? { method: "DELETE" } : { method: "DELETE", json }),
};
