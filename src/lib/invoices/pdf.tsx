import path from "node:path";

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { InvoiceKind, VatRate } from "@/generated/prisma/enums";
import { formatPLN } from "@/lib/money";
import { groszeToPolishWords } from "@/lib/money-words";
import { INVOICE_KIND_LABEL, isAccountingDocument } from "@/lib/validations/invoice";

import { VAT_LABEL } from "./vat";

/**
 * Rachunek / faktura jako PDF.
 *
 * Font osadzany z pliku TTF z tego samego powodu, co w umowie: wbudowane fonty
 * PDF używają kodowania WinAnsi, w którym nie ma polskich znaków diakrytycznych.
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
    fontSize: 9,
    lineHeight: 1.45,
    color: COLORS.ink,
    paddingTop: 44,
    paddingBottom: 60,
    paddingHorizontal: 46,
  },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  /**
   * Logo wystawcy. Wysokość ustalona, szerokość dobiera się sama — inaczej
   * herb w kwadracie i podłużny napis firmy zajmowałyby ten sam prostokąt,
   * a jedno z nich wyszłoby rozciągnięte.
   */
  logo: { height: 34, maxWidth: 170, marginBottom: 8, objectFit: "contain" },
  title: { fontSize: 16, fontWeight: 700 },
  number: { fontSize: 11, fontWeight: 600, color: COLORS.accent, marginTop: 2 },
  headerDates: { alignItems: "flex-end" },
  headerDateRow: { flexDirection: "row", gap: 6 },
  headerDateLabel: { color: COLORS.muted },
  headerDateValue: { fontWeight: 600, width: 72, textAlign: "right" },

  parties: { flexDirection: "row", gap: 20, marginTop: 22 },
  party: { flex: 1 },
  partyLabel: {
    fontSize: 7.5,
    fontWeight: 600,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  partyName: { fontSize: 10, fontWeight: 600 },
  partyLine: { color: COLORS.muted },

  periodNote: { marginTop: 16, color: COLORS.muted },

  tableHead: {
    flexDirection: "row",
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  headCell: { fontSize: 7.5, fontWeight: 600, color: COLORS.accent, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.rule,
  },
  rowAlt: { backgroundColor: COLORS.zebra },

  colIndex: { width: "4%" },
  colDescription: { width: "38%", paddingRight: 6 },
  colQuantity: { width: "12%", textAlign: "right" },
  colUnitPrice: { width: "14%", textAlign: "right" },
  colVat: { width: "10%", textAlign: "right" },
  colNet: { width: "10%", textAlign: "right" },
  colGross: { width: "12%", textAlign: "right" },

  summary: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
  summaryBox: { width: "56%" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  summaryLabel: { color: COLORS.muted },
  summaryValue: { fontWeight: 600 },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
  },
  summaryTotalLabel: { fontSize: 10, fontWeight: 700 },
  summaryTotalValue: { fontSize: 12, fontWeight: 700, color: COLORS.accent },

  words: { marginTop: 10, fontSize: 8.5 },
  wordsLabel: { color: COLORS.muted },

  settlement: {
    marginTop: 18,
    padding: 10,
    backgroundColor: COLORS.zebra,
    borderRadius: 6,
  },
  settlementRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1 },

  notes: { marginTop: 16, color: COLORS.muted },

  disclaimer: {
    marginTop: 16,
    padding: 8,
    borderWidth: 0.7,
    borderColor: COLORS.rule,
    borderRadius: 6,
    fontSize: 8,
    color: COLORS.muted,
    lineHeight: 1.4,
  },

  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 44 },
  signature: { width: "40%", alignItems: "center" },
  signatureLine: { borderTopWidth: 0.7, borderTopColor: COLORS.ink, width: "100%", marginBottom: 4 },
  signatureCaption: { fontSize: 7.5, color: COLORS.muted },

  footer: {
    position: "absolute",
    bottom: 26,
    left: 46,
    right: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.muted,
  },
});

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatDate = (date: Date | null | undefined) => (date ? dateFormatter.format(date) : "—");

/** 4235 tysięcznych → „4,235"; całkowite ilości bez zbędnych zer. */
function formatQuantity(quantityMilli: number): string {
  const value = quantityMilli / 1000;
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/0+$/, "").replace(".", ",");
}

export type InvoicePdfLine = {
  description: string;
  quantityMilli: number;
  unit: string;
  unitPriceNetGrosze: number;
  vatRate: VatRate;
  netGrosze: number;
  vatGrosze: number;
  grossGrosze: number;
};

export type InvoicePdfData = {
  kind: InvoiceKind;
  number: string;
  issueDate: Date;
  saleDate: Date;
  dueDate: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  cancelled: boolean;

  seller: {
    name: string;
    taxId: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
  };

  /**
   * Logo wystawcy jako data URI. NULL = dokument bez nagłówka graficznego,
   * czyli dokładnie taki, jak przed dołożeniem tej opcji.
   */
  logoDataUrl: string | null;

  buyer: {
    name: string;
    taxId: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
  };

  /** Czego dotyczy rozliczenie — adres lokalu na dokumencie. */
  subject: string | null;

  lines: InvoicePdfLine[];
  vatBreakdown: Array<{ rate: VatRate; netGrosze: number; vatGrosze: number }>;

  totalNetGrosze: number;
  totalVatGrosze: number;
  totalGrossGrosze: number;
  paidGrosze: number;

  notes: string | null;
};

function addressLines(party: { street: string | null; postalCode: string | null; city: string | null }) {
  return [party.street, [party.postalCode, party.city].filter(Boolean).join(" ")]
    .filter((part) => part && part.trim() !== "")
    .map((part) => part as string);
}

function Party({
  label,
  party,
}: {
  label: string;
  party: InvoicePdfData["seller"];
}) {
  return (
    <View style={styles.party}>
      <Text style={styles.partyLabel}>{label}</Text>
      <Text style={styles.partyName}>{party.name}</Text>
      {addressLines(party).map((line, index) => (
        <Text key={index} style={styles.partyLine}>
          {line}
        </Text>
      ))}
      {party.taxId ? <Text style={styles.partyLine}>NIP: {party.taxId}</Text> : null}
    </View>
  );
}

/**
 * Jedna strona dokumentu.
 *
 * Wydzielona z `InvoiceDocument`, żeby ten sam układ dało się złożyć zarówno
 * w plik z jednym dokumentem, jak i w paczkę wielu — bez duplikowania szablonu,
 * który za pół roku rozjechałby się między wariantami.
 */
function InvoicePage({ data }: { data: InvoicePdfData }) {
  const remaining = Math.max(0, data.totalGrossGrosze - data.paidGrosze);
  // Rozbicie po stawkach pokazujemy tylko wtedy, gdy na dokumencie jest więcej
  // niż jedna — przy samym „zw." powielałoby wiersz sumy.
  const showBreakdown = data.vatBreakdown.length > 1;

  // Naliczenie nie jest dowodem księgowym, więc dokument musi to powiedzieć
  // wprost — inaczej najemca odda je księgowej, a ta odeśle je z powrotem.
  const accounting = isAccountingDocument(data.kind);

  return (
    <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- <Image> renderera PDF-a, nie <img>: atrybutu alt nie przyjmuje */}
            {data.logoDataUrl ? <Image src={data.logoDataUrl} style={styles.logo} /> : null}
            <Text style={styles.title}>
              {INVOICE_KIND_LABEL[data.kind]}
              {data.cancelled ? " (ANULOWANY)" : ""}
            </Text>
            <Text style={styles.number}>nr {data.number}</Text>
          </View>

          <View style={styles.headerDates}>
            <View style={styles.headerDateRow}>
              <Text style={styles.headerDateLabel}>Data wystawienia</Text>
              <Text style={styles.headerDateValue}>{formatDate(data.issueDate)}</Text>
            </View>
            <View style={styles.headerDateRow}>
              <Text style={styles.headerDateLabel}>Data sprzedaży</Text>
              <Text style={styles.headerDateValue}>{formatDate(data.saleDate)}</Text>
            </View>
            <View style={styles.headerDateRow}>
              <Text style={styles.headerDateLabel}>Termin płatności</Text>
              <Text style={styles.headerDateValue}>{formatDate(data.dueDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.parties}>
          <Party label="Sprzedawca" party={data.seller} />
          <Party label="Nabywca" party={data.buyer} />
        </View>

        {data.subject || data.periodStart ? (
          <Text style={styles.periodNote}>
            {data.subject ? `Dotyczy: ${data.subject}` : ""}
            {data.subject && data.periodStart ? " · " : ""}
            {data.periodStart
              ? `Okres rozliczeniowy: ${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}`
              : ""}
          </Text>
        ) : null}

        <View style={styles.tableHead}>
          <Text style={[styles.headCell, styles.colIndex]}>#</Text>
          <Text style={[styles.headCell, styles.colDescription]}>Nazwa usługi</Text>
          <Text style={[styles.headCell, styles.colQuantity]}>Ilość</Text>
          <Text style={[styles.headCell, styles.colUnitPrice]}>Cena netto</Text>
          <Text style={[styles.headCell, styles.colVat]}>VAT</Text>
          <Text style={[styles.headCell, styles.colNet]}>Netto</Text>
          <Text style={[styles.headCell, styles.colGross]}>Brutto</Text>
        </View>

        {data.lines.map((line, index) => (
          <View key={index} style={index % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}>
            <Text style={styles.colIndex}>{index + 1}</Text>
            <Text style={styles.colDescription}>{line.description}</Text>
            <Text style={styles.colQuantity}>
              {formatQuantity(line.quantityMilli)} {line.unit}
            </Text>
            <Text style={styles.colUnitPrice}>{formatPLN(line.unitPriceNetGrosze)}</Text>
            <Text style={styles.colVat}>{VAT_LABEL[line.vatRate]}</Text>
            <Text style={styles.colNet}>{formatPLN(line.netGrosze)}</Text>
            <Text style={styles.colGross}>{formatPLN(line.grossGrosze)}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            {showBreakdown
              ? data.vatBreakdown.map((bucket) => (
                  <View key={bucket.rate} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Netto {VAT_LABEL[bucket.rate]} · VAT {formatPLN(bucket.vatGrosze)}
                    </Text>
                    <Text style={styles.summaryValue}>{formatPLN(bucket.netGrosze)}</Text>
                  </View>
                ))
              : null}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Razem netto</Text>
              <Text style={styles.summaryValue}>{formatPLN(data.totalNetGrosze)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Razem VAT</Text>
              <Text style={styles.summaryValue}>{formatPLN(data.totalVatGrosze)}</Text>
            </View>

            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Do zapłaty</Text>
              <Text style={styles.summaryTotalValue}>{formatPLN(data.totalGrossGrosze)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.words}>
          <Text style={styles.wordsLabel}>Słownie: </Text>
          {groszeToPolishWords(data.totalGrossGrosze)}
        </Text>

        {data.paidGrosze > 0 ? (
          <View style={styles.settlement}>
            <View style={styles.settlementRow}>
              <Text style={styles.summaryLabel}>Wpłacono</Text>
              <Text style={styles.summaryValue}>{formatPLN(data.paidGrosze)}</Text>
            </View>
            <View style={styles.settlementRow}>
              <Text style={styles.summaryLabel}>Pozostaje do zapłaty</Text>
              <Text style={styles.summaryValue}>{formatPLN(remaining)}</Text>
            </View>
          </View>
        ) : null}

        {data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}

        {!accounting ? (
          <Text style={styles.disclaimer}>
            Naliczenie ma charakter informacyjny — wskazuje kwotę i termin płatności.
            Nie jest fakturą ani rachunkiem w rozumieniu przepisów o rachunkowości i nie
            stanowi podstawy do księgowania ani odliczenia podatku. Dokument księgowy
            wystawiamy na życzenie.
          </Text>
        ) : null}

        {/* Rubryki podpisu tylko na dokumencie księgowym — pod naliczeniem
            sugerowałyby moc dowodową, której ono nie ma. */}
        {accounting ? (
          <View style={styles.signatures}>
            <View style={styles.signature}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureCaption}>Wystawił</Text>
            </View>
            <View style={styles.signature}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureCaption}>Odebrał</Text>
            </View>
          </View>
        ) : null}

      <View style={styles.footer} fixed>
        <Text>
          {INVOICE_KIND_LABEL[data.kind]} nr {data.number} · {data.seller.name}
        </Text>
        {/* Numeracja stron jest w obrębie jednego dokumentu — w paczce każdy
            dokument zaczyna się od nowej strony, więc licznik globalny mówiłby
            najemcy „strona 7 z 40" na jego jedynej stronie. */}
      </View>
    </Page>
  );
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document
      title={`${INVOICE_KIND_LABEL[data.kind]} ${data.number}`}
      author={data.seller.name}
      language="pl"
    >
      <InvoicePage data={data} />
    </Document>
  );
}

/**
 * Wiele dokumentów w jednym pliku — do pobrania paczką z listy finansów.
 *
 * Jeden PDF, a nie archiwum z osobnymi plikami: paczkę drukuje się i wysyła
 * księgowemu jednym ruchem, a przeglądarka i tak potrafi pobrać tylko jeden
 * plik na kliknięcie.
 */
export function InvoiceBatchDocument({
  documents,
  authorName,
}: {
  documents: InvoicePdfData[];
  authorName: string;
}) {
  return (
    <Document title={`Dokumenty rozliczeniowe (${documents.length})`} author={authorName} language="pl">
      {documents.map((data, index) => (
        <InvoicePage key={index} data={data} />
      ))}
    </Document>
  );
}
