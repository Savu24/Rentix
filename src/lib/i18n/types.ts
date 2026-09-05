import type { pl } from "./dictionaries/pl";

/**
 * Kształt słownika wyznacza wersja polska — najstarsza i najpełniejsza.
 * Każdy inny język deklaruje się jako `Dictionary`, więc brak klucza jest
 * błędem kompilacji, a nie pustym miejscem na stronie.
 */
export type Dictionary = typeof pl;

/**
 * Część słownika, która ma prawo trafić do przeglądarki.
 *
 * Reszta — teksty dokumentów PDF, treści wiadomości i opisy pozycji naliczania —
 * powstaje wyłącznie na serwerze. Przesyłanie ich razem z każdą stroną
 * doklejałoby do strony głównej kilkanaście kilobajtów tekstu, którego nikt
 * tam nie użyje, a `emails.variables` zostaje, bo edytor szablonów wypisuje
 * je pod polem.
 */
export type ClientDictionary = Pick<Dictionary, "common" | "auth" | "panel" | "emails">;
