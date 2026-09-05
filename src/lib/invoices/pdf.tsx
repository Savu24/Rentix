import path from "node:path";

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { InvoiceKind, VatRate } from "@/generated/prisma/enums";
import { formatBankAccount } from "@/lib/bank-account";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { groszeToPolishWords } from "@/lib/money-words";
import { invoiceKindLabels, isAccountingDocument } from "@/lib/validations/invoice";

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

  /*
    Układ bez rozbicia na VAT — dla brytyjskiego rachunku za czynsz, gdzie
    najem mieszkaniowy jest z podatku zwolniony i trzy kolumny pokazywałyby
    tę samą liczbę obok pustego pola. Zwolniony metraż rozchodzi się na opis
    i wartość, bo to one niosą treść dokumentu.
  */
  colDescriptionWide: { width: "52%", paddingRight: 6 },
  colAmount: { width: "18%", textAlign: "right" },

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

  payment: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 0.7,
    borderTopColor: COLORS.rule,
  },
  paymentLabel: { color: COLORS.muted },
  paymentAccount: { fontWeight: 600, letterSpacing: 0.3 },

  /*
    Wariant pionowy — dla rachunku, który ma więcej niż jedną wartość do
    przepisania (sort code i numer konta) plus prośbę o tytuł przelewu.
    W jednym wierszu te trzy rzeczy nachodziły na siebie.
  */
  paymentStacked: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 0.7,
    borderTopColor: COLORS.rule,
    gap: 2,
  },
  paymentPair: { flexDirection: "row", gap: 6 },
  paymentPairLabel: { color: COLORS.muted, width: 86 },

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

/**
 * 4235 tysięcznych → „4,235" po polsku, „4.235" po brytyjsku.
 *
 * Separator dziesiętny idzie za krajem tak samo jak w kwotach — dokument,
 * na którym cena ma kropkę, a ilość przecinek, czyta się jak literówkę.
 */
function formatQuantity(quantityMilli: number, locale: Locale): string {
  const value = quantityMilli / 1000;
  if (Number.isInteger(value)) return String(value);

  const text = value.toFixed(3).replace(/0+$/, "");
  return locale === "pl" ? text.replace(".", ",") : text;
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
  /**
   * Wersja krajowa wystawcy. Decyduje o walucie i o nazwie dokumentu — polska
   * faktura VAT i brytyjski rachunek za czynsz to dwa różne dokumenty, a nie
   * ten sam w dwóch językach.
   */
  locale: Locale;
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

  /**
   * Rachunek wystawcy, na który ma trafić przelew — same cyfry, jak w bazie.
   * NULL = wynajmujący nie podał go w ustawieniach, więc dokument nic
   * o sposobie zapłaty nie mówi.
   */
  bankAccount: string | null;

  lines: InvoicePdfLine[];
  vatBreakdown: Array<{ rate: VatRate; netGrosze: number; vatGrosze: number }>;

  totalNetGrosze: number;
  totalVatGrosze: number;
  totalGrossGrosze: number;
  paidGrosze: number;

  notes: string | null;
};

/**
 * Co pokazać na dokumencie — same rozstrzygnięcia, bez JSX-a.
 *
 * Wydzielone z komponentu, bo to tu siedzą różnice między polską fakturą
 * a brytyjskim rachunkiem, a treści złożonego PDF-a nie da się odczytać
 * z bufora (strumień jest skompresowany). Testowanie tego przez porównywanie
 * rozmiarów plików mówiłoby tylko tyle, że coś się zmieniło.
 */
export function invoiceLayout(data: InvoicePdfData) {
  const t = getDictionary(data.locale).documents.invoice;
  const remaining = Math.max(0, data.totalGrossGrosze - data.paidGrosze);

  return {
    remaining,

    /*
      Rozliczenie wpłat pokazujemy tylko wtedy, gdy zostało coś do zapłaty.
      Na dokumencie spłaconym w całości para „Wpłacono / Pozostaje 0,00 zł" nic
      nie wnosi, a zmienia treść rachunku po jego wystawieniu — najemca dostaje
      wtedy dwie różne wersje tego samego numeru.
    */
    showSettlement: data.paidGrosze > 0 && remaining > 0,

    /*
      Rozbicie na netto, VAT i brutto jest obowiązkową częścią polskiej faktury,
      także przy stawce zwolnionej — dlatego po polsku pokazujemy je zawsze.

      Brytyjski najem mieszkaniowy jest z VAT zwolniony, więc te same trzy
      kolumny niosłyby tę samą liczbę trzy razy. Pokazujemy je dopiero wtedy,
      gdy podatek naprawdę jest: przy lokalu użytkowym albo najmie
      krótkoterminowym wystawianym przez wynajmującego zarejestrowanego do VAT.
    */
    showVat: data.locale === "pl" || data.kind === "VAT_INVOICE" || data.totalVatGrosze !== 0,

    /* Rozbicie po stawkach ma sens dopiero przy więcej niż jednej. */
    showBreakdown: data.vatBreakdown.length > 1,

    /*
      Data sprzedaży to pozycja wymagana przez strukturę FA(2). Na brytyjskim
      rachunku za czynsz nie znaczy nic i tylko myli — zostaje tam, gdzie
      odpowiada tax pointowi, czyli na fakturze VAT.
    */
    showSaleDate: data.locale === "pl" || data.kind === "VAT_INVOICE",

    /*
      Naliczenie nie jest dowodem księgowym, więc dokument musi to powiedzieć
      wprost — inaczej najemca odda je księgowej, a ta odeśle je z powrotem.
    */
    accounting: isAccountingDocument(data.kind),

    /* Kwota słownie i rubryki podpisu to wymogi i konwencje polskiego dokumentu. */
    showAmountInWords: Boolean(t.amountInWords),
    showSignatures: isAccountingDocument(data.kind) && Boolean(t.signedBy),

    /* Prośba o numer w tytule przelewu — bez niej brytyjskiej wpłaty nie da się dopasować. */
    showPaymentReference: Boolean(t.paymentReference),
  };
}

/**
 * Adres w zapisie kraju.
 *
 * Polska stawia kod pocztowy przed miejscowością w jednej linii („30-001
 * Kraków"). Wielka Brytania odwrotnie: miasto w swojej linii, kod pocztowy
 * w ostatniej, sam. Adres złożony po polsku wygląda na brytyjskiej kopercie
 * jak literówka, a listonoszowi utrudnia sortowanie.
 */
function addressLines(
  party: { street: string | null; postalCode: string | null; city: string | null },
  locale: Locale,
): string[] {
  const parts =
    locale === "uk"
      ? [party.street, party.city, party.postalCode]
      : [party.street, [party.postalCode, party.city].filter(Boolean).join(" ")];

  return parts.filter((part): part is string => Boolean(part && part.trim() !== ""));
}

function Party({
  label,
  taxIdLabel,
  locale,
  party,
}: {
  label: string;
  taxIdLabel: string;
  locale: Locale;
  party: InvoicePdfData["seller"];
}) {
  return (
    <View style={styles.party}>
      <Text style={styles.partyLabel}>{label}</Text>
      <Text style={styles.partyName}>{party.name}</Text>
      {addressLines(party, locale).map((line, index) => (
        <Text key={index} style={styles.partyLine}>
          {line}
        </Text>
      ))}
      {party.taxId ? (
        <Text style={styles.partyLine}>
          {taxIdLabel}: {party.taxId}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Jak zapłacić.
 *
 * Polska mieści się w jednym wierszu: jeden numer rachunku i nic poza nim.
 * Brytyjski przelew wymaga sort code'u i numeru konta — dwóch wartości, które
 * wpisuje się w dwa osobne pola w banku — plus prośby o tytuł przelewu, bo bez
 * niej wpłata przychodzi bez żadnego opisu i nie da się jej dopasować do
 * rachunku. Trzy rzeczy obok siebie nachodziły na siebie, więc ten wariant
 * układa je jedna pod drugą.
 */
function PaymentBlock({
  data,
  showReference,
}: {
  data: InvoicePdfData;
  showReference: boolean;
}) {
  const t = getDictionary(data.locale).documents.invoice;
  const account = formatBankAccount(data.bankAccount ?? "", data.locale);

  if (!t.sortCode) {
    return (
      <View style={styles.payment}>
        <Text style={styles.paymentLabel}>{t.paymentLabel}</Text>
        <Text style={styles.paymentAccount}>{account}</Text>
      </View>
    );
  }

  // „12-34-56 12345678" — spacja rozdziela sort code od numeru konta.
  const [sortCode, accountNumber] = account.split(" ");

  return (
    <View style={styles.paymentStacked}>
      <Text style={styles.paymentLabel}>{t.paymentLabel}</Text>

      <View style={styles.paymentPair}>
        <Text style={styles.paymentPairLabel}>{t.sortCode}</Text>
        <Text style={styles.paymentAccount}>{sortCode}</Text>
      </View>
      <View style={styles.paymentPair}>
        <Text style={styles.paymentPairLabel}>{t.accountNumber}</Text>
        <Text style={styles.paymentAccount}>{accountNumber}</Text>
      </View>

      {showReference ? (
        <Text style={styles.paymentLabel}>
          {fill(t.paymentReference, { number: data.number })}
        </Text>
      ) : null}
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
  const dictionary = getDictionary(data.locale);
  const t = dictionary.documents.invoice;
  const vatLabels = dictionary.documents.vat;

  const money = (grosze: number) => formatMoney(grosze, data.locale);
  const date = (value: Date | null | undefined) =>
    value ? formatDateIn(value, data.locale, "numeric") : t.noDate;

  const {
    remaining,
    showSettlement,
    showBreakdown,
    showVat,
    showSaleDate,
    accounting,
    showAmountInWords,
    showSignatures,
    showPaymentReference,
  } = invoiceLayout(data);

  return (
    <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- <Image> renderera PDF-a, nie <img>: atrybutu alt nie przyjmuje */}
            {data.logoDataUrl ? <Image src={data.logoDataUrl} style={styles.logo} /> : null}
            <Text style={styles.title}>
              {invoiceKindLabels(dictionary)[data.kind]}
              {data.cancelled ? t.cancelled : ""}
            </Text>
            <Text style={styles.number}>
              {t.numberPrefix}
              {data.number}
            </Text>
          </View>

          <View style={styles.headerDates}>
            <View style={styles.headerDateRow}>
              <Text style={styles.headerDateLabel}>{t.issueDate}</Text>
              <Text style={styles.headerDateValue}>{date(data.issueDate)}</Text>
            </View>
            {showSaleDate ? (
              <View style={styles.headerDateRow}>
                <Text style={styles.headerDateLabel}>{t.saleDate}</Text>
                <Text style={styles.headerDateValue}>{date(data.saleDate)}</Text>
              </View>
            ) : null}
            <View style={styles.headerDateRow}>
              <Text style={styles.headerDateLabel}>{t.dueDate}</Text>
              <Text style={styles.headerDateValue}>{date(data.dueDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.parties}>
          <Party
            label={t.seller}
            taxIdLabel={t.taxIdLabel}
            locale={data.locale}
            party={data.seller}
          />
          <Party
            label={t.buyer}
            taxIdLabel={t.taxIdLabel}
            locale={data.locale}
            party={data.buyer}
          />
        </View>

        {data.subject || data.periodStart ? (
          <Text style={styles.periodNote}>
            {data.subject ? fill(t.subject, { subject: data.subject }) : ""}
            {data.subject && data.periodStart ? " · " : ""}
            {data.periodStart
              ? fill(t.period, { from: date(data.periodStart), to: date(data.periodEnd) })
              : ""}
          </Text>
        ) : null}

        <View style={styles.tableHead}>
          <Text style={[styles.headCell, styles.colIndex]}>{t.columns.index}</Text>
          <Text
            style={[
              styles.headCell,
              showVat ? styles.colDescription : styles.colDescriptionWide,
            ]}
          >
            {t.columns.description}
          </Text>
          <Text style={[styles.headCell, styles.colQuantity]}>{t.columns.quantity}</Text>
          <Text style={[styles.headCell, styles.colUnitPrice]}>{t.columns.unitPrice}</Text>
          {showVat ? (
            <>
              <Text style={[styles.headCell, styles.colVat]}>{t.columns.vat}</Text>
              <Text style={[styles.headCell, styles.colNet]}>{t.columns.net}</Text>
              <Text style={[styles.headCell, styles.colGross]}>{t.columns.gross}</Text>
            </>
          ) : (
            <Text style={[styles.headCell, styles.colAmount]}>{t.columns.amount}</Text>
          )}
        </View>

        {data.lines.map((line, index) => (
          <View key={index} style={index % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}>
            <Text style={styles.colIndex}>{index + 1}</Text>
            <Text style={showVat ? styles.colDescription : styles.colDescriptionWide}>
              {line.description}
            </Text>
            <Text style={styles.colQuantity}>
              {formatQuantity(line.quantityMilli, data.locale)} {line.unit}
            </Text>
            <Text style={styles.colUnitPrice}>{money(line.unitPriceNetGrosze)}</Text>
            {showVat ? (
              <>
                <Text style={styles.colVat}>{vatLabels[line.vatRate]}</Text>
                <Text style={styles.colNet}>{money(line.netGrosze)}</Text>
                <Text style={styles.colGross}>{money(line.grossGrosze)}</Text>
              </>
            ) : (
              <Text style={styles.colAmount}>{money(line.grossGrosze)}</Text>
            )}
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            {showBreakdown && showVat
              ? data.vatBreakdown.map((bucket) => (
                  <View key={bucket.rate} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      {fill(t.breakdown, {
                        rate: vatLabels[bucket.rate],
                        vat: money(bucket.vatGrosze),
                      })}
                    </Text>
                    <Text style={styles.summaryValue}>{money(bucket.netGrosze)}</Text>
                  </View>
                ))
              : null}

            {showVat ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t.totalNet}</Text>
                  <Text style={styles.summaryValue}>{money(data.totalNetGrosze)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t.totalVat}</Text>
                  <Text style={styles.summaryValue}>{money(data.totalVatGrosze)}</Text>
                </View>
              </>
            ) : null}

            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>{t.totalDue}</Text>
              <Text style={styles.summaryTotalValue}>{money(data.totalGrossGrosze)}</Text>
            </View>
          </View>
        </View>

        {/*
          Kwota słownie jest wymogiem polskiej faktury i pisownią polską —
          pusty tekst w słowniku wyłącza ten wiersz w wersjach, które go
          nie potrzebują.
        */}
        {showAmountInWords ? (
          <Text style={styles.words}>
            <Text style={styles.wordsLabel}>{t.amountInWords}</Text>
            {groszeToPolishWords(data.totalGrossGrosze)}
          </Text>
        ) : null}

        {/* Rachunek do przelewu zostaje na dokumencie niezależnie od wpłat:
            to dana wystawcy, nie stan rozliczenia. Znika tylko z anulowanego,
            bo na anulowany nikt nie ma już przelewać. */}
        {data.bankAccount && !data.cancelled ? (
          <PaymentBlock data={data} showReference={showPaymentReference} />
        ) : null}

        {showSettlement ? (
          <View style={styles.settlement}>
            <View style={styles.settlementRow}>
              <Text style={styles.summaryLabel}>{t.paidSoFar}</Text>
              <Text style={styles.summaryValue}>{money(data.paidGrosze)}</Text>
            </View>
            <View style={styles.settlementRow}>
              <Text style={styles.summaryLabel}>{t.remaining}</Text>
              <Text style={styles.summaryValue}>{money(remaining)}</Text>
            </View>
          </View>
        ) : null}

        {data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}

        {!accounting ? <Text style={styles.disclaimer}>{t.chargeDisclaimer}</Text> : null}

        {/* Rubryki podpisu tylko na dokumencie księgowym — pod naliczeniem
            sugerowałyby moc dowodową, której ono nie ma. */}
        {/* Rubryki podpisu to polska konwencja papierowa — brytyjski rachunek
            ich nie ma, więc słownik zostawia tam pusty tekst. */}
        {showSignatures ? (
          <View style={styles.signatures}>
            <View style={styles.signature}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureCaption}>{t.signedBy}</Text>
            </View>
            <View style={styles.signature}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureCaption}>{t.receivedBy}</Text>
            </View>
          </View>
        ) : null}

      <View style={styles.footer} fixed>
        <Text>
          {invoiceKindLabels(dictionary)[data.kind]} {t.numberPrefix}
          {data.number} · {data.seller.name}
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
      title={`${invoiceKindLabels(getDictionary(data.locale))[data.kind]} ${data.number}`}
      author={data.seller.name}
      language={LOCALE_META[data.locale].htmlLang}
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
  // Paczka jest zawsze z jednego konta, więc kraj bierzemy z pierwszego
  // dokumentu; pusta paczka i tak nie ma czego opisać.
  const locale = documents[0]?.locale ?? DEFAULT_LOCALE;

  return (
    <Document
      title={fill(getDictionary(locale).documents.invoice.batchTitle, {
        count: documents.length,
      })}
      author={authorName}
      language={LOCALE_META[locale].htmlLang}
    >
      {documents.map((data, index) => (
        <InvoicePage key={index} data={data} />
      ))}
    </Document>
  );
}
