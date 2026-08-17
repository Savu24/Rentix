import path from "node:path";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { UtilitiesMode } from "@/generated/prisma/enums";
import { formatPLN } from "@/lib/money";
import { formatPropertyAddress, formatUnitLabel } from "@/lib/properties/address";
import { groszeToPolishWords } from "@/lib/money-words";
import { UTILITIES_MODE_LABEL } from "@/lib/validations/lease";

/**
 * Umowa najmu jako PDF.
 *
 * Font jest osadzany z pliku TTF, a nie brany z wbudowanych fontów PDF:
 * standardowe Helvetica/Times używają kodowania WinAnsi, w którym nie ma
 * ą, ć, ę, ł, ń, ś, ź ani ż — polski tekst wychodziłby dziurawy.
 * TTF-y biorą się z `@expo-google-fonts/inter` (ten sam krój co w interfejsie),
 * przypięte lockfile'em, więc build jest powtarzalny.
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

// Bez tego @react-pdf łamie wyrazy w dowolnym miejscu, co przy polskich
// słowach wygląda źle. Wyłączamy dzielenie — akapity i tak są krótkie.
Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  ink: "#16301D",
  muted: "#6B7266",
  accent: "#1B4D3E",
  rule: "#DED2B8",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9.5,
    lineHeight: 1.5,
    color: COLORS.ink,
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 52,
  },
  title: { fontSize: 15, fontWeight: 700, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 9, color: COLORS.muted, textAlign: "center", marginBottom: 20 },
  meta: { fontSize: 9, color: COLORS.muted, marginBottom: 18, textAlign: "right" },

  partyBlock: { marginBottom: 12 },
  partyLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  partyName: { fontSize: 10.5, fontWeight: 600 },
  partyLine: { fontSize: 9, color: COLORS.muted },

  sectionTitle: { fontSize: 10, fontWeight: 700, marginTop: 14, marginBottom: 5 },
  paragraph: { marginBottom: 5, textAlign: "justify" },
  listItem: { marginBottom: 3, paddingLeft: 12 },

  rule: { borderBottomWidth: 0.7, borderBottomColor: COLORS.rule, marginVertical: 12 },

  table: { marginTop: 4, marginBottom: 6 },
  row: { flexDirection: "row", paddingVertical: 3 },
  rowAlt: { backgroundColor: "#F7F4EE" },
  cellLabel: { width: "42%", color: COLORS.muted },
  cellValue: { width: "58%", fontWeight: 600 },

  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 42 },
  signature: { width: "42%", alignItems: "center" },
  signatureLine: {
    borderTopWidth: 0.7,
    borderTopColor: COLORS.ink,
    width: "100%",
    marginBottom: 4,
  },
  signatureCaption: { fontSize: 8, color: COLORS.muted },

  disclaimer: {
    marginTop: 26,
    fontSize: 7.5,
    color: COLORS.muted,
    lineHeight: 1.4,
  },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.muted,
  },
});

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatDate = (date: Date | null | undefined) =>
  date ? dateFormatter.format(date) : "—";

export type LeasePdfData = {
  number: string | null;
  startDate: Date;
  endDate: Date | null;
  rentGrosze: number;
  depositGrosze: number;
  utilitiesMode: UtilitiesMode;
  utilitiesAdvanceGrosze: number;
  billingDay: number;
  paymentTermDays: number;
  notes: string | null;

  landlord: {
    name: string;
    taxId: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
  };

  tenants: Array<{
    firstName: string;
    lastName: string;
    street: string | null;
    postalCode: string | null;
    city: string | null;
    taxId: string | null;
    email: string | null;
    phone: string | null;
  }>;

  property: {
    name: string;
    street: string;
    buildingNumber: string;
    apartmentNumber: string | null;
    postalCode: string;
    city: string;
    areaM2: string | null;
    floor: number | null;
    roomCount: number;
  };

  /** Ustawione = przedmiotem najmu jest ten pokój, a nie cała nieruchomość. */
  room: { name: string } | null;

  /** Data i miejscowość sporządzenia — nagłówek dokumentu. */
  issuedAt: Date;
  issuedIn: string;
};

function addressLines(party: {
  street: string | null;
  postalCode: string | null;
  city: string | null;
}): string | null {
  const line = [party.street, [party.postalCode, party.city].filter(Boolean).join(" ")]
    .filter((part) => part && part.trim() !== "")
    .join(", ");
  return line || null;
}

function Row({ label, value, alt }: { label: string; value: string; alt?: boolean }) {
  return (
    <View style={alt ? [styles.row, styles.rowAlt] : styles.row}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value}</Text>
    </View>
  );
}

/** Opis rozliczania mediów zależny od trybu — trafia wprost do §3. */
function utilitiesClause(data: LeasePdfData): string {
  switch (data.utilitiesMode) {
    case "INCLUDED":
      return "Opłaty za media zawarte są w kwocie czynszu i nie podlegają odrębnemu rozliczeniu.";
    case "FLAT_RATE":
      return `Oprócz czynszu Najemca uiszcza zaliczkę na poczet opłat za media w kwocie ${formatPLN(
        data.utilitiesAdvanceGrosze,
      )} miesięcznie.`;
    case "METERED":
      return "Opłaty za media Najemca pokrywa według wskazań liczników, na podstawie rozliczenia przedstawionego przez Wynajmującego.";
    case "MIXED":
      return `Oprócz czynszu Najemca uiszcza zaliczkę na poczet opłat za media w kwocie ${formatPLN(
        data.utilitiesAdvanceGrosze,
      )} miesięcznie, rozliczaną okresowo według wskazań liczników.`;
  }
}

export function LeaseAgreementDocument({ data }: { data: LeasePdfData }) {
  const landlordAddress = addressLines(data.landlord);
  const propertyAddress = formatPropertyAddress(data.property);

  // Bez numeru mieszkania przedmiotem najmu jest cały budynek — i tak trzeba to
  // nazwać. „Lokal nr 14" przy domu jednorodzinnym pod numerem 14 czytałoby się
  // jak mieszkanie o tym numerze, którego w tym budynku nie ma.
  const unitLabel = formatUnitLabel(data.property);

  // Przy najmie pokoju przedmiotem umowy jest sam pokój, a mieszkanie jest
  // tylko jego adresem — opis musi to oddawać, inaczej dokument sugerowałby
  // wynajęcie całego lokalu.
  const subjectDescription = data.room
    ? [
        `pokój „${data.room.name}” w lokalu ${data.property.apartmentNumber ?? data.property.buildingNumber}`,
        data.property.floor !== null ? `położonym na ${data.property.floor} piętrze` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : [
        unitLabel,
        data.property.areaM2 ? `o powierzchni ${data.property.areaM2} m²` : null,
        data.property.roomCount > 0
          ? `składający się z ${data.property.roomCount} pokoi`
          : null,
        data.property.floor !== null ? `położony na ${data.property.floor} piętrze` : null,
      ]
        .filter(Boolean)
        .join(", ");

  return (
    <Document
      title={`Umowa najmu ${data.number ?? ""}`.trim()}
      author={data.landlord.name}
      language="pl"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.meta}>
          {data.issuedIn}, {formatDate(data.issuedAt)}
        </Text>

        <Text style={styles.title}>
          {data.room ? "UMOWA NAJMU POKOJU" : "UMOWA NAJMU LOKALU MIESZKALNEGO"}
        </Text>
        <Text style={styles.subtitle}>
          {data.number ? `nr ${data.number}` : "bez numeru"}
        </Text>

        <Text style={styles.paragraph}>
          Zawarta w dniu {formatDate(data.issuedAt)} w miejscowości {data.issuedIn}, pomiędzy:
        </Text>

        <View style={styles.partyBlock}>
          <Text style={styles.partyLabel}>Wynajmujący</Text>
          <Text style={styles.partyName}>{data.landlord.name}</Text>
          {landlordAddress ? <Text style={styles.partyLine}>{landlordAddress}</Text> : null}
          {data.landlord.taxId ? (
            <Text style={styles.partyLine}>NIP: {data.landlord.taxId}</Text>
          ) : null}
        </View>

        <View style={styles.partyBlock}>
          <Text style={styles.partyLabel}>
            {data.tenants.length > 1 ? "Najemcy" : "Najemca"}
          </Text>
          {data.tenants.map((tenant, index) => {
            const address = addressLines(tenant);
            return (
              <View key={index} style={{ marginBottom: index < data.tenants.length - 1 ? 6 : 0 }}>
                <Text style={styles.partyName}>
                  {tenant.firstName} {tenant.lastName}
                </Text>
                {address ? <Text style={styles.partyLine}>{address}</Text> : null}
                {tenant.taxId ? <Text style={styles.partyLine}>NIP: {tenant.taxId}</Text> : null}
                {tenant.phone ? <Text style={styles.partyLine}>tel. {tenant.phone}</Text> : null}
              </View>
            );
          })}
        </View>

        <View style={styles.rule} />

        <Text style={styles.sectionTitle}>§ 1. Przedmiot najmu</Text>
        <Text style={styles.paragraph}>
          1. Wynajmujący oddaje Najemcy w najem {subjectDescription}, znajdujący się w budynku
          położonym pod adresem: {propertyAddress}.
        </Text>
        <Text style={styles.paragraph}>
          2. Najemca oświadcza, że zapoznał się ze stanem technicznym lokalu i nie wnosi
          do niego zastrzeżeń.
        </Text>

        <Text style={styles.sectionTitle}>§ 2. Okres najmu</Text>
        <Text style={styles.paragraph}>
          {data.endDate
            ? `Umowa zostaje zawarta na czas oznaczony, od dnia ${formatDate(
                data.startDate,
              )} do dnia ${formatDate(data.endDate)}.`
            : `Umowa zostaje zawarta na czas nieoznaczony, począwszy od dnia ${formatDate(
                data.startDate,
              )}.`}
        </Text>

        <Text style={styles.sectionTitle}>§ 3. Czynsz i opłaty</Text>
        <View style={styles.table}>
          <Row label="Czynsz miesięczny" value={formatPLN(data.rentGrosze)} alt />
          <Row label="Słownie" value={groszeToPolishWords(data.rentGrosze)} />
          <Row label="Rozliczenie mediów" value={UTILITIES_MODE_LABEL[data.utilitiesMode]} alt />
          <Row label="Dzień naliczania" value={`${data.billingDay}. dzień miesiąca`} />
          <Row label="Termin płatności" value={`${data.paymentTermDays} dni od wystawienia`} alt />
        </View>
        <Text style={styles.paragraph}>{utilitiesClause(data)}</Text>
        <Text style={styles.paragraph}>
          Czynsz płatny jest z góry, przelewem na rachunek bankowy wskazany przez
          Wynajmującego, w terminie {data.paymentTermDays} dni od dnia wystawienia
          dokumentu rozliczeniowego.
        </Text>

        <Text style={styles.sectionTitle}>§ 4. Kaucja</Text>
        <Text style={styles.paragraph}>
          {data.depositGrosze > 0
            ? `Najemca wpłaca kaucję zabezpieczającą w kwocie ${formatPLN(
                data.depositGrosze,
              )} (słownie: ${groszeToPolishWords(
                data.depositGrosze,
              )}). Kaucja podlega zwrotowi w terminie miesiąca od dnia opróżnienia lokalu, po potrąceniu ewentualnych należności Wynajmującego.`
            : "Strony nie ustanawiają kaucji zabezpieczającej."}
        </Text>

        <Text style={styles.sectionTitle}>§ 5. Obowiązki stron</Text>
        <Text style={styles.listItem}>
          1. Najemca zobowiązuje się używać lokalu zgodnie z jego przeznaczeniem oraz
          utrzymywać go w należytym stanie technicznym i sanitarnym.
        </Text>
        <Text style={styles.listItem}>
          2. Najemca nie może oddać lokalu w podnajem ani do bezpłatnego używania osobie
          trzeciej bez pisemnej zgody Wynajmującego.
        </Text>
        <Text style={styles.listItem}>
          3. Wynajmujący zobowiązuje się zapewnić sprawne działanie instalacji i urządzeń
          znajdujących się w lokalu oraz dokonywać napraw obciążających właściciela.
        </Text>
        <Text style={styles.listItem}>
          4. Najemca zobowiązuje się udostępnić lokal Wynajmującemu w celu dokonania
          przeglądu lub napraw, po uprzednim uzgodnieniu terminu.
        </Text>

        <Text style={styles.sectionTitle}>§ 6. Postanowienia końcowe</Text>
        <Text style={styles.paragraph}>
          1. Wszelkie zmiany umowy wymagają formy pisemnej pod rygorem nieważności.
        </Text>
        <Text style={styles.paragraph}>
          2. W sprawach nieuregulowanych umową zastosowanie mają przepisy Kodeksu cywilnego
          oraz ustawy o ochronie praw lokatorów.
        </Text>
        <Text style={styles.paragraph}>
          3. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej
          ze stron.
        </Text>

        {data.notes ? (
          <>
            <Text style={styles.sectionTitle}>§ 7. Ustalenia dodatkowe</Text>
            <Text style={styles.paragraph}>{data.notes}</Text>
          </>
        ) : null}

        <View style={styles.signatures}>
          <View style={styles.signature}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureCaption}>Wynajmujący</Text>
          </View>
          <View style={styles.signature}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureCaption}>
              {data.tenants.length > 1 ? "Najemcy" : "Najemca"}
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          Dokument wygenerowany automatycznie w systemie Rentix na podstawie danych umowy.
          Stanowi wzór do uzupełnienia i podpisania przez strony — nie jest poradą prawną.
          Przed podpisaniem zweryfikuj treść pod kątem swojej sytuacji, w razie potrzeby
          z prawnikiem.
        </Text>

        <View style={styles.footer} fixed>
          <Text>{data.number ? `Umowa nr ${data.number}` : "Umowa najmu"}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
