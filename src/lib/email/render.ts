import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";

/**
 * Podstawianie zmiennych w treści pisanej przez wynajmującego.
 *
 * Wynajmujący pisze zwykły tekst ze znacznikami `{{imie_najemcy}}`, a nie HTML.
 * Dwa powody, oba twarde:
 *
 * 1. Nie ma obowiązku umieć HTML-a. Pole, w którym trzeba pamiętać o `<p>`,
 *    zostanie puste albo wypełnione tekstem ze złamanymi znacznikami.
 * 2. Tekst od użytkownika wklejony wprost do wiadomości to otwarte wstrzyknięcie
 *    znaczników — wystarczy niedomknięty `<table>`, żeby rozsypać cały układ
 *    u odbiorcy. Dlatego treść wchodzi do ramy wyłącznie przez `escapeHtml`.
 *
 * Podmiana jest zwykłym przeszukaniem mapy, bez silnika szablonów. Silnik
 * ogólnego przeznaczenia w miejscu, w którym tekst pochodzi od użytkownika,
 * a wynik idzie pocztą do osób trzecich, to nieproporcjonalne ryzyko wobec
 * korzyści — tutaj potrzebne są podstawienia, nie pętle i warunki.
 *
 * Nazwy znaczników idą za językiem konta. To nie jest kosmetyka: wpisuje je
 * człowiek, a `{{imie_najemcy}}` w angielskim edytorze byłoby zagadką.
 * Organizacja ma jeden kraj, więc jej szablony mówią jednym zestawem nazw.
 */

/** Miejsca, w które wchodzą wartości — wspólne dla wszystkich wersji krajowych. */
export type VariableSlot = keyof Dictionary["emails"]["variables"];

export type TemplateVariable = {
  readonly slot: VariableSlot;
  readonly name: string;
  readonly description: string;
  readonly example: string;
};

/** Lista do podpowiedzi pod polem edytora. Kolejność jak w słowniku. */
export function templateVariables(d: Pick<Dictionary, "emails">): TemplateVariable[] {
  return Object.entries(d.emails.variables).map(([slot, variable]) => ({
    slot: slot as VariableSlot,
    ...variable,
  }));
}

/** Wartości podstawiane w tekst, kluczowane nazwą znacznika danej wersji. */
export type TemplateValues = Record<string, string>;

/**
 * Wzorzec znacznika. Dopuszcza spacje w środku (`{{ kwota }}`), bo edytor
 * tekstu i kopiowanie z podpowiedzi potrafią je dołożyć, a wynajmujący nie ma
 * powodu podejrzewać, że spacja psuje wiadomość.
 */
const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Wartości do podglądu, gdy konto jest świeże i nie ma jeszcze żadnej faktury. */
export function sampleValues(d: Pick<Dictionary, "emails">): TemplateValues {
  return Object.fromEntries(
    Object.values(d.emails.variables).map((variable) => [variable.name, variable.example]),
  );
}

/** Wartości ze slotów na nazwy znaczników obowiązujące w tej wersji krajowej. */
export function valuesForLocale(
  d: Pick<Dictionary, "emails">,
  bySlot: Partial<Record<VariableSlot, string>>,
): TemplateValues {
  const values: TemplateValues = {};

  for (const [slot, variable] of Object.entries(d.emails.variables)) {
    const value = bySlot[slot as VariableSlot];
    if (value !== undefined) values[variable.name] = value;
  }

  return values;
}

/**
 * Podstawia wartości w tekście.
 *
 * Znacznik bez wartości znika bez śladu, zamiast zostawić w wiadomości surowe
 * `{{okres}}`. Dokument jednorazowy nie ma okresu rozliczeniowego, a najemca nie
 * powinien oglądać wnętrza szablonu tylko dlatego, że jedno pole jest puste.
 * Nieznaną nazwę traktujemy tak samo — formularz ostrzega o niej przy zapisie,
 * czyli wtedy, gdy jest jeszcze kogo zapytać.
 */
export function renderTemplateText(template: string, values: TemplateValues): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => values[name] ?? "");
}

/**
 * Nazwy użyte w tekście, których nie ma na liście dozwolonych.
 *
 * Służy walidacji formularza: literówka w `{{imie_najmcy}}` nie może wyjść na
 * jaw dopiero w skrzynce najemcy.
 *
 * Sprawdzamy wobec nazw z **wersji konta**: nazwa poprawna po polsku jest
 * literówką w szablonie brytyjskim i odwrotnie, a wysłana wiadomość miałaby
 * w tym miejscu dziurę.
 */
export function unknownVariables(template: string, d: Pick<Dictionary, "emails">): string[] {
  const known = new Set(Object.values(d.emails.variables).map((variable) => variable.name));
  const found = new Set<string>();

  for (const match of template.matchAll(PLACEHOLDER)) {
    const name = match[1];
    if (name && !known.has(name)) found.add(name);
  }

  return [...found];
}

/**
 * Escapuje znaki o znaczeniu w HTML-u.
 *
 * Apostrof i cudzysłów też, mimo że treść trafia między znaczniki, a nie do
 * atrybutu: układ wiadomości jest składany ze stringów, a jedna zmiana miejsca
 * wstawienia wystarczy, żeby tekst bez apostrofu nagle wylądował w `style="…"`.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Tekst wynajmującego jako bezpieczny fragment HTML.
 *
 * Pojedyncze złamanie wiersza staje się `<br />`, pusta linia rozdziela akapity
 * odstępem. Nie zamieniamy tego na `<p>`, bo fragment wchodzi w istniejący
 * akapit ramy, a `<p>` w `<p>` klienci pocztowi renderują różnie.
 */
export function textToHtml(text: string): string {
  return escapeHtml(text.trim())
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, "<br />"))
    .join('<br /><span style="display:block;height:10px;line-height:10px;">&nbsp;</span>');
}

/**
 * Treść pola szablonu gotowa do wstawienia w ramę wiadomości.
 *
 * `null` oznacza „wynajmujący nic nie napisał" — wołający ma wtedy użyć
 * domyślnego tekstu z kodu. Pole wypełnione samymi spacjami traktujemy jak
 * puste: zapisanie spacji nie jest deklaracją, że wiadomość ma być pusta.
 */
export function renderField(
  template: string | null | undefined,
  values: TemplateValues,
): string | null {
  const source = template?.trim();
  if (!source) return null;

  const rendered = renderTemplateText(source, values).trim();
  return rendered || null;
}

/** Domyślna wersja krajowa dla wołających, którzy jej nie znają. */
export const FALLBACK_EMAIL_LOCALE: Locale = DEFAULT_LOCALE;
