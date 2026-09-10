import path from "node:path";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { getDictionary } from "@/lib/i18n";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { fill, formatDayRangeIn, monthNames } from "@/lib/i18n/format";
import { slugify } from "@/lib/utils";

import { monthKey } from "./rotation";
import type { CleaningDutyView, CleaningMonth } from "./service";

/**
 * Harmonogram sprzątania jako PDF do wydruku.
 *
 * Rozpiska kończy życie na lodówce albo na drzwiach do kuchni, a nie na
 * ekranie właściciela — dlatego kartka ma pustą kratkę na odhaczenie tygodnia
 * i niesie adres lokalu: w mieszkaniu przy trzech pokojach nikt nie pamięta,
 * z którego mieszkania jest wydruk leżący na stole.
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
  accent: "#1B4D3E",
  rule: "#DED2B8",
  zebra: "#F7F4EE",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    lineHeight: 1.45,
    color: COLORS.ink,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 52,
  },

  // Interlinia strony (1.45) na siedemnastce zostawia tytułowi tyle luzu pod
  // spodem, że miesiąc dosiadał się do jego ogonków. Nagłówek prowadzi własną.
  title: { fontSize: 17, fontWeight: 700, lineHeight: 1.2 },
  month: { fontSize: 12, fontWeight: 600, color: COLORS.accent, marginTop: 4 },
  address: { fontSize: 9.5, color: COLORS.muted, marginTop: 6 },
  mode: { fontSize: 9.5, color: COLORS.muted },

  tableHead: {
    flexDirection: "row",
    marginTop: 22,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  headCell: { fontSize: 8, fontWeight: 600, color: COLORS.accent, textTransform: "uppercase" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    // Wiersz wyższy niż na fakturze: w tę kratkę wpisuje się długopisem.
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.rule,
  },
  rowAlt: { backgroundColor: COLORS.zebra },

  colWeek: { width: "12%" },
  colDates: { width: "30%" },
  colWho: { width: "44%", paddingRight: 8 },
  colDone: { width: "14%", alignItems: "flex-end" },

  week: { color: COLORS.muted },
  dates: { color: COLORS.muted },
  who: { fontWeight: 600 },
  /** Kratka do odhaczenia — pusta ramka, bo wypełnia ją człowiek, nie druk. */
  box: { width: 13, height: 13, borderWidth: 0.8, borderColor: COLORS.rule },

  rule: { marginTop: 20, fontSize: 9, color: COLORS.muted },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 52,
    right: 52,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "center",
  },
});

export type CleaningPdfData = {
  locale: Locale;
  propertyName: string;
  propertyAddress: string;
  organizationName: string;
  month: CleaningMonth;
  /** Czy dyżury chodzą po najemcach z umowy na całość, czy po pokojach. */
  byTenants: boolean;
  duties: CleaningDutyView[];
};

/** „wrzesień 2026" — ten sam podpis miesiąca co nad tabelą w panelu. */
function monthLabel(month: CleaningMonth, locale: Locale): string {
  return `${monthNames(locale)[month.monthIndex]} ${month.year}`;
}

/**
 * Nazwa pliku: rodzaj dokumentu, lokal i miesiąc.
 *
 * Miesiąc doklejamy po slugifikacji, a nie przed: `slugify` przycina długie
 * nazwy do 48 znaków i zjadłoby właśnie tę końcówkę, przez którą dwa wydruki
 * tego samego mieszkania dają się w folderze pobranych rozróżnić.
 */
export function cleaningPdfFilename(data: {
  locale: Locale;
  propertyName: string;
  month: CleaningMonth;
}): string {
  const label = getDictionary(data.locale).documents.cleaning.filename;
  const key = monthKey(data.month.year, data.month.monthIndex);

  return `${slugify(`${label} ${data.propertyName}`)}-${key}.pdf`;
}

export function CleaningScheduleDocument({ data }: { data: CleaningPdfData }) {
  const t = getDictionary(data.locale).documents.cleaning;
  const label = monthLabel(data.month, data.locale);

  return (
    <Document
      title={`${t.title} — ${data.propertyName}, ${label}`}
      author={data.organizationName}
      language={LOCALE_META[data.locale].htmlLang}
    >
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.month}>{label}</Text>
          <Text style={styles.address}>
            {data.propertyName} · {data.propertyAddress}
          </Text>
          <Text style={styles.mode}>{data.byTenants ? t.byTenants : t.byRooms}</Text>
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.headCell, styles.colWeek]}>{t.weekColumn}</Text>
          <Text style={[styles.headCell, styles.colDates]}>{t.datesColumn}</Text>
          <Text style={[styles.headCell, styles.colWho]}>{t.whoColumn}</Text>
          <View style={styles.colDone}>
            <Text style={styles.headCell}>{t.doneColumn}</Text>
          </View>
        </View>

        {data.duties.map((duty, index) => (
          <View
            key={duty.startsOn}
            style={index % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
            wrap={false}
          >
            <Text style={[styles.week, styles.colWeek]}>{duty.index}</Text>
            <Text style={[styles.dates, styles.colDates]}>
              {formatDayRangeIn(duty.startsOn, duty.endsOn, data.locale)}
            </Text>
            <Text style={[styles.who, styles.colWho]}>{duty.label}</Text>
            <View style={styles.colDone}>
              <View style={styles.box} />
            </View>
          </View>
        ))}

        <Text style={styles.rule}>{t.rule}</Text>

        <Text style={styles.footer} fixed>
          {fill(t.footer, { property: data.propertyName, month: label })}
        </Text>
      </Page>
    </Document>
  );
}
