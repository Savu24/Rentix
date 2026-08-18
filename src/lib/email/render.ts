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
 */

/** Nazwy zmiennych, których wolno użyć w treści. Kolejność jak w podpowiedzi UI. */
export const TEMPLATE_VARIABLES = [
  { name: "imie_najemcy", description: "Imię najemcy", example: "Jan" },
  { name: "nazwisko_najemcy", description: "Nazwisko najemcy", example: "Kowalski" },
  { name: "nazwa_wynajmujacego", description: "Twoja nazwa albo nazwa firmy", example: "Miret sp. z o.o." },
  { name: "numer_dokumentu", description: "Numer rachunku", example: "R 6/08/2026" },
  { name: "kwota", description: "Kwota dokumentu", example: "629,03 zł" },
  { name: "do_zaplaty", description: "Kwota pozostała do zapłaty", example: "629,03 zł" },
  { name: "termin", description: "Termin płatności", example: "22 sierpnia 2026" },
  { name: "okres", description: "Okres rozliczeniowy", example: "sierpień 2026" },
  { name: "dni_po_terminie", description: "Ile dni minęło od terminu", example: "5" },
  { name: "adres_lokalu", description: "Adres wynajmowanego lokalu", example: "Długa 14/3, 30-001 Kraków" },
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]["name"];

export type TemplateValues = Partial<Record<TemplateVariable, string>>;

const VARIABLE_NAMES: ReadonlySet<string> = new Set(
  TEMPLATE_VARIABLES.map((variable) => variable.name),
);

/**
 * Wzorzec znacznika. Dopuszcza spacje w środku (`{{ kwota }}`), bo edytor
 * tekstu i kopiowanie z podpowiedzi potrafią je dołożyć, a wynajmujący nie ma
 * powodu podejrzewać, że spacja psuje wiadomość.
 */
const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Wartości do podglądu, gdy konto jest świeże i nie ma jeszcze żadnej faktury. */
export const SAMPLE_VALUES: TemplateValues = Object.fromEntries(
  TEMPLATE_VARIABLES.map((variable) => [variable.name, variable.example]),
) as TemplateValues;

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
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = values[name as TemplateVariable];
    return value ?? "";
  });
}

/**
 * Nazwy użyte w tekście, których nie ma na liście dozwolonych.
 *
 * Służy walidacji formularza: literówka w `{{imie_najmcy}}` nie może wyjść na
 * jaw dopiero w skrzynce najemcy.
 */
export function unknownVariables(template: string): string[] {
  const found = new Set<string>();

  for (const match of template.matchAll(PLACEHOLDER)) {
    const name = match[1];
    if (name && !VARIABLE_NAMES.has(name)) found.add(name);
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
