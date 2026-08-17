/**
 * Kwota słownie po polsku — wymagana na umowach najmu i wekslach.
 *
 * „2 400,00 zł" → „dwa tysiące czterysta złotych 00/100".
 * Grosze zapisujemy cyframi (00/100), tak jak w praktyce notarialnej —
 * słowne rozpisywanie groszy jest rzadkie i tylko wydłuża zdanie.
 */

const ONES = [
  "", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć",
  "dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście",
  "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście",
];

const TENS = [
  "", "", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt",
  "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt",
];

const HUNDREDS = [
  "", "sto", "dwieście", "trzysta", "czterysta", "pięćset",
  "sześćset", "siedemset", "osiemset", "dziewięćset",
];

/** Formy: [1, 2–4, 5+] — polska odmiana zależy od ostatnich cyfr. */
const SCALES: Array<[string, string, string]> = [
  ["", "", ""],
  ["tysiąc", "tysiące", "tysięcy"],
  ["milion", "miliony", "milionów"],
  ["miliard", "miliardy", "miliardów"],
];

/**
 * Wybiera formę gramatyczną dla liczby.
 * 1 → forma pojedyncza; 2–4 → mnoga „lekka"; reszta → dopełniacz mnogi.
 * Wyjątek: 12–14 (i 112–114 itd.) biorą dopełniacz, mimo końcówki 2–4.
 */
function pluralForm(n: number, forms: [string, string, string]): string {
  if (n === 1) return forms[0];

  const lastTwo = n % 100;
  const last = n % 10;

  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return forms[1];
  return forms[2];
}

/** Rozpisuje liczbę 1–999 na słowa. */
function tripletToWords(n: number): string[] {
  const words: string[] = [];

  const hundreds = Math.floor(n / 100);
  if (hundreds > 0) words.push(HUNDREDS[hundreds]!);

  const rest = n % 100;
  if (rest >= 20) {
    words.push(TENS[Math.floor(rest / 10)]!);
    if (rest % 10 > 0) words.push(ONES[rest % 10]!);
  } else if (rest > 0) {
    words.push(ONES[rest]!);
  }

  return words;
}

/** Liczba całkowita nieujemna → słowa. 0 → „zero". */
export function integerToPolishWords(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Oczekiwano nieujemnej liczby całkowitej, otrzymano ${value}`);
  }
  if (value === 0) return "zero";

  // Dzielimy na trójki od końca: [jednostki, tysiące, miliony, miliardy].
  const triplets: number[] = [];
  let rest = value;
  while (rest > 0) {
    triplets.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  if (triplets.length > SCALES.length) {
    throw new Error(`Kwota poza obsługiwanym zakresem: ${value}`);
  }

  const parts: string[] = [];
  for (let scale = triplets.length - 1; scale >= 0; scale--) {
    const triplet = triplets[scale]!;
    if (triplet === 0) continue;

    // „jeden tysiąc" brzmi sztucznie — mówi się po prostu „tysiąc".
    if (!(scale > 0 && triplet === 1)) {
      parts.push(...tripletToWords(triplet));
    }

    if (scale > 0) parts.push(pluralForm(triplet, SCALES[scale]!));
  }

  return parts.join(" ");
}

/** 240000 (grosze) → „dwa tysiące czterysta złotych 00/100". */
export function groszeToPolishWords(grosze: number): string {
  if (!Number.isInteger(grosze)) {
    throw new Error(`Kwota w groszach musi być liczbą całkowitą, otrzymano ${grosze}`);
  }

  const negative = grosze < 0;
  const absolute = Math.abs(grosze);
  const zloty = Math.floor(absolute / 100);
  const fraction = absolute % 100;

  const words = integerToPolishWords(zloty);
  const unit = pluralForm(zloty, ["złoty", "złote", "złotych"]);
  const cents = String(fraction).padStart(2, "0");

  return `${negative ? "minus " : ""}${words} ${unit} ${cents}/100`;
}
