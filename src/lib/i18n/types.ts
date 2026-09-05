import type { pl } from "./dictionaries/pl";

/**
 * Kształt słownika wyznacza wersja polska — najstarsza i najpełniejsza.
 * Każdy inny język deklaruje się jako `Dictionary`, więc brak klucza jest
 * błędem kompilacji, a nie pustym miejscem na stronie.
 */
export type Dictionary = typeof pl;
