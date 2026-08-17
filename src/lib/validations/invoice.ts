import { z } from "zod";

import { InvoiceKind, InvoiceStatus, PaymentMethod, VatRate } from "@/generated/prisma/enums";

import {
  dateInput,
  idSchema,
  moneyInput,
  optionalDateInput,
  optionalText,
  requiredText,
} from "./common";

const invoiceKinds = Object.values(InvoiceKind) as [InvoiceKind, ...InvoiceKind[]];
const invoiceStatuses = Object.values(InvoiceStatus) as [InvoiceStatus, ...InvoiceStatus[]];
const paymentMethods = Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]];
const vatRates = Object.values(VatRate) as [VatRate, ...VatRate[]];

export const INVOICE_KIND_LABEL: Record<InvoiceKind, string> = {
  BILL: "Rachunek",
  VAT_INVOICE: "Faktura VAT",
  PROFORMA: "Proforma",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  TRANSFER: "Przelew",
  CASH: "Gotówka",
  CARD: "Karta",
  DIRECT_DEBIT: "Polecenie zapłaty",
  OTHER: "Inna",
};

/**
 * Ilość na pozycji dokumentu → tysięczne części jednostki.
 *
 * Pozycja za wodę to 4,235 m³, więc ilość ma trzy miejsca po przecinku.
 * Trzymamy ją jako liczbę całkowitą tysięcznych, żeby mnożenie ceny przez
 * ilość odbyło się na liczbach całkowitych (`multiplyByQuantity`), a nie
 * na floatach, które gubiłyby grosze przy sumowaniu pozycji.
 */
export const quantityInput = z
  .union([z.string(), z.number()])
  .default(1)
  .transform((value, ctx) => {
    const raw = typeof value === "number" ? String(value) : value.trim().replace(",", ".");
    const parsed = Number(raw);

    if (raw === "" || !Number.isFinite(parsed)) {
      ctx.addIssue({ code: "custom", message: "Ilość musi być liczbą" });
      return z.NEVER;
    }
    if (parsed <= 0) {
      ctx.addIssue({ code: "custom", message: "Ilość musi być większa od zera" });
      return z.NEVER;
    }
    if (parsed > 1_000_000) {
      ctx.addIssue({ code: "custom", message: "Ilość wygląda na zawyżoną" });
      return z.NEVER;
    }

    return Math.round(parsed * 1000);
  });

export const invoiceLineSchema = z.object({
  description: requiredText("Opis pozycji", 200),
  quantityMilli: quantityInput,
  unit: z
    .string()
    .trim()
    .max(12, "Maksymalnie 12 znaków")
    .default("szt.")
    .transform((value) => (value === "" ? "szt." : value)),
  unitPriceNetGrosze: moneyInput("Cena jednostkowa"),
  vatRate: z.enum(vatRates).default("ZW"),
});

export type InvoiceLineFormInput = z.input<typeof invoiceLineSchema>;

/**
 * Dokument wystawiany ręcznie — kaucja, korekta, rozliczenie mediów.
 *
 * Dokumenty czynszowe powstają automatycznie z umowy
 * (`generateInvoicesForMonth`), więc ten schemat nie dubluje jej warunków:
 * pozycje przychodzą wprost, a nie są wyliczane z czynszu.
 */
export const invoiceCreateSchema = z
  .object({
    /** Puste = dokument jednorazowy, niepowiązany z żadną umową. */
    leaseId: z
      .union([z.literal(""), idSchema])
      .optional()
      .transform((value) => (value === "" || value === undefined ? null : value)),
    /** Nabywca. Jego dane kopiujemy na dokument w chwili wystawienia. */
    tenantId: idSchema,

    kind: z.enum(invoiceKinds).default("BILL"),

    issueDate: dateInput("Data wystawienia"),
    saleDate: dateInput("Data sprzedaży"),
    dueDate: dateInput("Termin płatności"),

    periodStart: optionalDateInput("Początek okresu"),
    periodEnd: optionalDateInput("Koniec okresu"),

    lines: z
      .array(invoiceLineSchema)
      .min(1, "Dokument musi mieć przynajmniej jedną pozycję")
      .max(50, "Maksymalnie 50 pozycji na dokumencie"),

    notes: optionalText(2000),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "Termin płatności nie może być wcześniejszy niż data wystawienia",
    path: ["dueDate"],
  })
  .refine((data) => !data.periodStart || !data.periodEnd || data.periodEnd >= data.periodStart, {
    message: "Koniec okresu nie może być wcześniejszy niż jego początek",
    path: ["periodEnd"],
  });

export type InvoiceCreateInput = z.input<typeof invoiceCreateSchema>;
export type InvoiceCreateOutput = z.output<typeof invoiceCreateSchema>;

/**
 * Filtr listy dokumentów.
 *
 * `status` przyjmuje też wartości wyliczane („OVERDUE", „UNPAID"), których nie
 * ma w bazie — patrz `src/lib/invoices/status.ts`. Serwis tłumaczy je na
 * warunek Prismy, więc filtrowanie zostaje po stronie Postgresa.
 */
export const INVOICE_FILTERS = ["all", "UNPAID", "OVERDUE", ...invoiceStatuses] as const;

export const invoiceListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(INVOICE_FILTERS).default("all"),
  leaseId: z.string().max(64).optional(),
  tenantId: z.string().max(64).optional(),
  propertyId: z.string().max(64).optional(),
  /** Rok wystawienia — zawęża widok do jednego roku obrotowego. */
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type InvoiceListQuery = z.output<typeof invoiceListQuerySchema>;

export const paymentFormSchema = z.object({
  amountGrosze: moneyInput("Kwota wpłaty").refine((value) => value > 0, {
    message: "Kwota wpłaty musi być większa od zera",
  }),
  paidAt: dateInput("Data wpłaty"),
  method: z.enum(paymentMethods).default("TRANSFER"),
  /** Tytuł przelewu albo identyfikator z wyciągu — do uzgadniania z bankiem. */
  reference: optionalText(140),
  note: optionalText(500),
});

export type PaymentFormInput = z.input<typeof paymentFormSchema>;
export type PaymentFormOutput = z.output<typeof paymentFormSchema>;

/**
 * Naliczenie czynszu za wskazany miesiąc.
 *
 * Miesiąc podajemy w zapisie ludzkim (1–12), a nie liczonym od zera jak
 * w `Date` — parametr wpisuje się ręcznie w URL-u przy ponownym naliczeniu
 * i „08" musi znaczyć sierpień.
 */
export const generateInvoicesSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  /** Puste = wszystkie aktywne umowy organizacji. */
  leaseId: z
    .union([z.literal(""), idSchema])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
});

export type GenerateInvoicesOutput = z.output<typeof generateInvoicesSchema>;
