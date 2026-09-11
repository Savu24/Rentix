import path from "node:path";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { getDictionary } from "@/lib/i18n";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { formatDateIn, monthNames } from "@/lib/i18n/format";
import { slugify } from "@/lib/utils";

import { addDays, isoDay, parseIsoDay } from "./rotation";
import type { CleaningDutyView, CleaningRange } from "./service";

/**
 * Harmonogram sprzątania jako PDF do wydruku.
 *
 * Rozpiska kończy życie na lodówce albo na drzwiach do kuchni, a nie na
 * ekranie właściciela — dlatego kartka wygląda jak kalendarz ścienny: miesiące
 * w trzech kolumnach, w każdym tygodnie wiersz po wierszu, a przy wierszu, kto
 * sprząta. Lokator patrzy na dzisiejszą datę, a nie szuka numeru tygodnia.
 *
 * Kolumny dni zaczynają się w dniu tygodnia, w którym rusza harmonogram —
 * przy starcie w piątek nagłówek idzie „pt so nd pn wt śr cz". Dzięki temu
 * każdy dyżur to dokładnie jeden wiersz, także na styku miesięcy: ten sam
 * tydzień stoi na końcu lipca i na początku sierpnia z tym samym podpisem.
 *
 * Font osadzany z pliku TTF, tak jak w umowie i na fakturze: wbudowane fonty
 * PDF nie mają polskich znaków diakrytycznych.
 */
const FONT_DIR = path.join(process.cwd(), "node_modules", "@expo-google-fonts", "inter");

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONT_DIR, "400Regular", "Inter_400Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "600SemiBold", "Inter_600SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "700Bold", "Inter_700Bold.ttf"), fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  ink: "#16301D",
  muted: "#6B7266",
  rule: "#DED2B8",
};

/** Szerokość strony A4 bez marginesów — z niej liczy się liczbę kolumn. */
const PAGE_WIDTH = 595;
const PAGE_MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * PAGE_MARGIN;

/** Kratka jednego dnia: dwucyfrowy numer w ósemce mieści się z zapasem. */
const DAY_CELL = 15;
const DAYS_WIDTH = 7 * DAY_CELL;
/** Odstęp między kolumnami miesięcy, po połowie z każdej strony. */
const GUTTER = 8;

/** Font ósemka: tyle punktów zajmuje przeciętnie jeden znak Intera. */
const CHAR_WIDTH = 4.6;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 8,
    lineHeight: 1.2,
    color: COLORS.ink,
    paddingTop: 36,
    paddingBottom: 64,
    paddingHorizontal: PAGE_MARGIN,
  },

  // Odstęp pod nagłówkiem liczy się na drugiej stronie: tam pod adresem od
  // razu zaczyna się siatka, bez tytułu, który na pierwszej trzyma dystans.
  header: { alignItems: "flex-end", marginBottom: 12 },
  headerLine: { fontSize: 11, lineHeight: 1.35 },
  headerMuted: { color: COLORS.muted },

  title: { fontSize: 16, textAlign: "center", marginTop: 6, marginBottom: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -GUTTER / 2 },
  month: { paddingHorizontal: GUTTER / 2, marginBottom: 10 },
  monthName: { width: DAYS_WIDTH, fontSize: 9, fontWeight: 700, textAlign: "center", marginBottom: 3 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.rule,
  },
  headRow: { color: COLORS.muted, fontSize: 7.5 },

  day: { width: DAY_CELL, textAlign: "center" },
  label: { textAlign: "center", paddingLeft: 4 },

  footer: {
    position: "absolute",
    bottom: 28,
    left: PAGE_MARGIN,
    right: PAGE_MARGIN,
    fontSize: 9,
    lineHeight: 1.6,
    textAlign: "center",
  },
});

export type CleaningPdfData = {
  locale: Locale;
  propertyName: string;
  propertyAddress: string;
  organizationName: string;
  range: CleaningRange;
  duties: CleaningDutyView[];
};

/** Jeden wiersz kalendarza: siedem kratek dnia (pusta poza miesiącem) i podpis. */
export type CalendarRow = { days: (number | null)[]; label: string };

export type CalendarMonth = {
  year: number;
  monthIndex: number;
  rows: CalendarRow[];
};

/**
 * Rozkłada dyżury na miesiące kalendarza.
 *
 * Każdy dyżur trafia do każdego miesiąca, którego dni obejmuje — tydzień na
 * styku stoi więc w obu, ale w każdym pokazuje tylko swoje dni. Kratki po
 * końcu harmonogramu zostają puste, tak jak dni sprzed jego początku: ostatni,
 * przycięty tydzień nie udaje pełnego.
 */
export function calendarMonths(duties: CleaningDutyView[], range: CleaningRange): CalendarMonth[] {
  const from = parseIsoDay(range.from);
  const to = parseIsoDay(range.to);
  if (!from || !to) return [];

  const months: CalendarMonth[] = [];
  let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));

  while (cursor <= to) {
    const year = cursor.getUTCFullYear();
    const monthIndex = cursor.getUTCMonth();
    const monthStart = isoDay(cursor);
    const monthEnd = isoDay(new Date(Date.UTC(year, monthIndex + 1, 0)));

    const rows = duties
      .filter((duty) => duty.startsOn <= monthEnd && duty.endsOn >= monthStart)
      .map((duty) => {
        const start = parseIsoDay(duty.startsOn)!;

        const days = Array.from({ length: 7 }, (_, offset) => {
          const day = addDays(start, offset);
          const key = isoDay(day);
          const inside = key >= monthStart && key <= monthEnd && key <= duty.endsOn;

          return inside ? day.getUTCDate() : null;
        });

        return { days, label: duty.label };
      });

    months.push({ year, monthIndex, rows });
    cursor = new Date(Date.UTC(year, monthIndex + 1, 1));
  }

  return months;
}

/**
 * Ile miesięcy mieści się obok siebie.
 *
 * Trzy, gdy podpisy są krótkie („Pokój 1", „2 (balkon)"). Imię i nazwisko
 * najemcy potrzebuje szerszej kolumny, więc miesiące schodzą do dwóch obok
 * siebie — lepiej dłuższa kartka niż nazwisko złamane w połowie.
 */
function layout(duties: CleaningDutyView[]): { columns: number; labelWidth: number } {
  const longest = Math.max(0, ...duties.map((duty) => duty.label.length));
  const labelWidth = Math.max(42, Math.ceil(longest * CHAR_WIDTH) + 8);
  const monthWidth = DAYS_WIDTH + labelWidth + GUTTER;

  return { columns: Math.min(3, Math.max(1, Math.floor(CONTENT_WIDTH / monthWidth))), labelWidth };
}

/**
 * Nazwa pliku: rodzaj dokumentu, lokal i dzień startu rozpiski.
 *
 * Datę doklejamy po slugifikacji, a nie przed: `slugify` przycina długie
 * nazwy do 48 znaków i zjadłoby właśnie tę końcówkę, przez którą dwa wydruki
 * tego samego mieszkania dają się w folderze pobranych rozróżnić.
 */
export function cleaningPdfFilename(data: {
  locale: Locale;
  propertyName: string;
  range: CleaningRange;
}): string {
  const label = getDictionary(data.locale).documents.cleaning.filename;

  return `${slugify(`${label} ${data.propertyName}`)}-${data.range.from}.pdf`;
}

export function CleaningScheduleDocument({ data }: { data: CleaningPdfData }) {
  const t = getDictionary(data.locale).documents.cleaning;
  // `Intl` daje mianownik małą literą („lipiec"); nad kalendarzem miesiąc
  // jest tytułem, więc dostaje wielką — tak jak na kartce z papierni.
  const intl = LOCALE_META[data.locale].intl;
  const names = monthNames(data.locale).map(
    (name) => name.charAt(0).toLocaleUpperCase(intl) + name.slice(1),
  );
  const months = calendarMonths(data.duties, data.range);
  const { columns, labelWidth } = layout(data.duties);

  const from = parseIsoDay(data.range.from)!;
  const period = `${formatDateIn(from, data.locale, "numeric")} – ${formatDateIn(
    parseIsoDay(data.range.to)!,
    data.locale,
    "numeric",
  )}`;

  // Nagłówek dni idzie od dnia tygodnia, w którym rusza harmonogram. Słownik
  // trzyma skróty od poniedziałku, a `getUTCDay()` liczy od niedzieli.
  const weekdays = Array.from(
    { length: 7 },
    (_, offset) => t.weekdays[(from.getUTCDay() + offset + 6) % 7],
  );

  const monthStyle = [styles.month, { width: `${100 / columns}%` }];
  const labelStyle = [styles.label, { width: labelWidth }];

  return (
    <Document
      title={`${t.title} ${period} — ${data.propertyName}`}
      author={data.organizationName}
      language={LOCALE_META[data.locale].htmlLang}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerLine}>
            {t.title} {period}
          </Text>
          <Text style={[styles.headerLine, styles.headerMuted]}>{data.propertyAddress}</Text>
        </View>

        <Text style={styles.title}>{t.commonAreas}</Text>

        <View style={styles.grid}>
          {months.map((month) => (
            <View key={`${month.year}-${month.monthIndex}`} style={monthStyle} wrap={false}>
              <Text style={styles.monthName}>{names[month.monthIndex]}</Text>

              <View style={[styles.row, styles.headRow]}>
                {weekdays.map((name, offset) => (
                  <Text key={offset} style={styles.day}>
                    {name}
                  </Text>
                ))}
                <Text style={labelStyle} />
              </View>

              {month.rows.map((row, index) => (
                <View key={index} style={styles.row}>
                  {row.days.map((day, offset) => (
                    <Text key={offset} style={styles.day}>
                      {day ?? ""}
                    </Text>
                  ))}
                  <Text style={labelStyle}>{row.label}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          {t.swapHint}
          {"\n"}
          {t.swapReminder}
        </Text>
      </Page>
    </Document>
  );
}
