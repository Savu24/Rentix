import type { Prisma } from "@/generated/prisma/client";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import {
  buildBillingPeriod,
  buildRentInvoiceLines,
  periodLabel,
  type BillingLease,
} from "@/lib/leases/billing";
import { prisma } from "@/lib/prisma";
import type {
  GenerateInvoicesOutput,
  InvoiceCreateOutput,
  InvoiceListQuery,
  PaymentFormOutput,
} from "@/lib/validations/invoice";

import { nextInvoiceNumber, withUniqueNumberRetry } from "./numbering";
import {
  buyerSnapshot,
  invoiceKindForLines,
  rentVatRate,
  resolveDocumentKind,
  settlementStatus,
} from "./rules";
import { overdueWhere, remainingGrosze, resolveInvoiceStatus } from "./status";
import { calculateInvoiceTotals, type InvoiceLineInput } from "./totals";

/**
 * Dokumenty rozliczeniowe i wpłaty.
 *
 * Każde zapytanie zawęża się do `organizationId` wziętego z sesji — tak samo
 * jak w pozostałych serwisach, nigdy z parametru w URL-u.
 */

/**
 * Pozycje policzone → payload dla Prismy.
 *
 * `vatBreakdown` zostaje poza wynikiem: rozbicie po stawkach jest potrzebne
 * na dokumencie, ale w bazie nie ma na nie kolumny — liczymy je z pozycji przy
 * renderowaniu PDF-a. Gdyby weszło do `totals`, `invoice.create` wywróciłby się
 * na nieznanym polu.
 */
function linesCreateData(lines: readonly InvoiceLineInput[]) {
  const calculation = calculateInvoiceTotals(lines);
  const calculated = calculation.lines;

  return {
    totals: {
      totalNetGrosze: calculation.totalNetGrosze,
      totalVatGrosze: calculation.totalVatGrosze,
      totalGrossGrosze: calculation.totalGrossGrosze,
    },
    lines: calculated.map((line, index) => ({
      description: line.description,
      // Decimal(12,3) — ilość wraca z tysięcznych na zapis dziesiętny.
      quantity: (line.quantityMilli / 1000).toFixed(3),
      unit: line.unit ?? "szt.",
      unitPriceNetGrosze: line.unitPriceNetGrosze,
      vatRate: line.vatRate,
      netGrosze: line.netGrosze,
      vatGrosze: line.vatGrosze,
      grossGrosze: line.grossGrosze,
      position: index,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Odczyt
// ═══════════════════════════════════════════════════════════════════════════

/** Warunek Prismy dla filtra statusu — łącznie z wartościami wyliczanymi. */
function statusWhere(status: InvoiceListQuery["status"], now: Date): Prisma.InvoiceWhereInput {
  switch (status) {
    case "all":
      return {};
    case "OVERDUE":
      return overdueWhere(now);
    case "UNPAID":
      return { status: { in: ["ISSUED", "PARTIALLY_PAID"] } };
    default:
      return { status: status as InvoiceStatus };
  }
}

/**
 * Zakres daty wystawienia z filtra.
 *
 * Rok i zakres dat składamy w jeden warunek, a nie dwa: Prisma bierze pod uwagę
 * tylko ostatni klucz `issueDate` w obiekcie, więc rozdzielone po cichu
 * kasowałyby się nawzajem.
 *
 * Górna granica jest włącznie — użytkownik wpisujący „do 31 sierpnia" ma na
 * myśli cały ten dzień, więc porównujemy z początkiem następnego.
 */
function issueDateWhere(query: InvoiceListQuery): Prisma.InvoiceWhereInput {
  const bounds: { gte?: Date; lt?: Date } = {};

  if (query.year) {
    bounds.gte = new Date(Date.UTC(query.year, 0, 1));
    bounds.lt = new Date(Date.UTC(query.year + 1, 0, 1));
  }
  if (query.issuedFrom) bounds.gte = query.issuedFrom;
  if (query.issuedTo) bounds.lt = nextDay(query.issuedTo);

  return Object.keys(bounds).length > 0 ? { issueDate: bounds } : {};
}

function dueDateWhere(query: InvoiceListQuery): Prisma.InvoiceWhereInput {
  const bounds: { gte?: Date; lt?: Date } = {};

  if (query.dueFrom) bounds.gte = query.dueFrom;
  if (query.dueTo) bounds.lt = nextDay(query.dueTo);

  return Object.keys(bounds).length > 0 ? { dueDate: bounds } : {};
}

/** Kwoty w filtrze podaje się w złotych, w bazie leżą w groszach. */
function amountWhere(query: InvoiceListQuery): Prisma.InvoiceWhereInput {
  const bounds: { gte?: number; lte?: number } = {};

  if (query.minAmount !== undefined) bounds.gte = Math.round(query.minAmount * 100);
  if (query.maxAmount !== undefined) bounds.lte = Math.round(query.maxAmount * 100);

  return Object.keys(bounds).length > 0 ? { totalGrossGrosze: bounds } : {};
}

const nextDay = (date: Date) => new Date(date.getTime() + 24 * 60 * 60 * 1000);

export type InvoiceListItem = Awaited<ReturnType<typeof listInvoices>>[number];

export async function listInvoices(organizationId: string, query: InvoiceListQuery) {
  const now = new Date();

  const where: Prisma.InvoiceWhereInput = {
    organizationId,
    ...statusWhere(query.status, now),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.leaseId ? { leaseId: query.leaseId } : {}),
    ...(query.propertyId ? { lease: { propertyId: query.propertyId } } : {}),
    ...(query.tenantId ? { lease: { tenants: { some: { tenantId: query.tenantId } } } } : {}),
    ...issueDateWhere(query),
    ...dueDateWhere(query),
    ...amountWhere(query),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: "insensitive" } },
            { buyerName: { contains: query.q, mode: "insensitive" } },
            { lease: { property: { name: { contains: query.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      id: true,
      number: true,
      kind: true,
      status: true,
      issueDate: true,
      dueDate: true,
      periodStart: true,
      periodEnd: true,
      buyerName: true,
      totalGrossGrosze: true,
      paidGrosze: true,
      lease: {
        select: {
          id: true,
          property: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    take: 200,
  });

  return invoices.map((invoice) => ({
    ...invoice,
    displayStatus: resolveInvoiceStatus(invoice, now),
    remainingGrosze: remainingGrosze(invoice),
  }));
}

export async function getInvoice(organizationId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      lines: { orderBy: { position: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      // Logo wchodzi jawnie, bo `organization: true` bierze same kolumny —
      // a obrazek leży w osobnej tabeli właśnie po to, żeby nie doklejał się
      // do zapytań, które go nie potrzebują.
      organization: { include: { logo: true } },
      tenant: true,
      lease: {
        include: {
          property: true,
          room: true,
          tenants: { orderBy: { isPrimary: "desc" }, include: { tenant: true } },
        },
      },
    },
  });
}

/** Ile dokumentów wolno pobrać jednym kliknięciem. */
export const MAX_BATCH_PDF = 100;

/**
 * Dokumenty do paczki PDF, w kolejności od najstarszego.
 *
 * Rosnąco po dacie wystawienia, odwrotnie niż na liście: paczka trafia do
 * segregatora albo do księgowego, a tam dokumenty idą chronologicznie.
 *
 * Identyfikatory przychodzą z formularza, więc zapytanie zawęża się do
 * organizacji z sesji — cudze id po prostu nie znajdzie dokumentu, zamiast
 * dołożyć go do czyjejś paczki.
 */
export async function getInvoicesForBatch(organizationId: string, ids: readonly string[]) {
  if (ids.length === 0) return [];

  return prisma.invoice.findMany({
    where: { organizationId, id: { in: ids.slice(0, MAX_BATCH_PDF) } },
    include: {
      lines: { orderBy: { position: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      organization: { include: { logo: true } },
      // Ten sam ksztalt co `getInvoice` — renderer PDF-a przyjmuje jeden typ,
      // wiec rozjazd miedzy zapytaniami psulby paczke, a nie pojedynczy dokument.
      tenant: true,
      lease: {
        include: {
          property: true,
          room: true,
          tenants: { orderBy: { isPrimary: "desc" }, include: { tenant: true } },
        },
      },
    },
    orderBy: [{ issueDate: "asc" }, { number: "asc" }],
  });
}

/**
 * Kafelki na górze widoku finansów.
 *
 * Trzy zapytania agregujące zamiast pobrania wszystkich dokumentów: sumy liczy
 * Postgres po indeksie (organizationId, status, dueDate), więc widok nie
 * zwalnia wraz z liczbą faktur.
 */
export async function financeSummary(organizationId: string, now: Date = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [unpaid, overdue, paidThisMonth] = await Promise.all([
    prisma.invoice.aggregate({
      where: { organizationId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      _sum: { totalGrossGrosze: true, paidGrosze: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { organizationId, ...overdueWhere(now) },
      _sum: { totalGrossGrosze: true, paidGrosze: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { organizationId, paidAt: { gte: monthStart, lt: nextMonthStart } },
      _sum: { amountGrosze: true },
    }),
  ]);

  const outstanding = (sums: { totalGrossGrosze: number | null; paidGrosze: number | null }) =>
    Math.max(0, (sums.totalGrossGrosze ?? 0) - (sums.paidGrosze ?? 0));

  return {
    unpaidCount: unpaid._count,
    unpaidGrosze: outstanding(unpaid._sum),
    overdueCount: overdue._count,
    overdueGrosze: outstanding(overdue._sum),
    paidThisMonthGrosze: paidThisMonth._sum.amountGrosze ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Wystawianie
// ═══════════════════════════════════════════════════════════════════════════

export type CreateInvoiceResult =
  | { ok: true; invoice: { id: string; number: string } }
  | { ok: false; reason: "TENANT_NOT_FOUND" }
  | { ok: false; reason: "LEASE_NOT_FOUND" };

/**
 * Dokument wystawiany ręcznie — kaucja, rozliczenie mediów, korekta.
 *
 * Powstaje od razu jako wystawiony, a nie jako szkic: numer w rejestrze jest
 * wymagany i unikalny, więc szkic musiałby albo zająć numer, którego może nigdy
 * nie użyć, albo nosić numer zastępczy. Pomyłkę anuluje się
 * przez `cancelInvoice`, tak jak w księgowości.
 */
export async function createInvoice(
  organizationId: string,
  data: InvoiceCreateOutput,
): Promise<CreateInvoiceResult> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: data.tenantId, organizationId },
  });
  if (!tenant) return { ok: false, reason: "TENANT_NOT_FOUND" };

  if (data.leaseId) {
    const lease = await prisma.lease.findFirst({
      where: { id: data.leaseId, organizationId },
      select: { id: true },
    });
    if (!lease) return { ok: false, reason: "LEASE_NOT_FOUND" };
  }

  const { totals, lines } = linesCreateData(data.lines);
  const kind = data.kind === "BILL" ? invoiceKindForLines(data.lines) : data.kind;

  const invoice = await withUniqueNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const number = await nextInvoiceNumber(tx, organizationId, kind, data.issueDate);

      return tx.invoice.create({
        data: {
          organizationId,
          leaseId: data.leaseId,
          // Relacja obok migawki `buyer*`: tamta zamraza dane na dokumencie,
          // ta daje wysylce aktualny adres e-mail nabywcy.
          tenantId: data.tenantId,
          status: "ISSUED",
          kind,
          number,
          issueDate: data.issueDate,
          saleDate: data.saleDate,
          dueDate: data.dueDate,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          notes: data.notes,
          ...totals,
          ...buyerSnapshot(tenant),
          lines: { create: lines },
        },
        select: { id: true, number: true },
      });
    }),
  );

  return { ok: true, invoice };
}

/**
 * Anulowanie dokumentu.
 *
 * Nie kasujemy rekordu: numer musi zostać zajęty, żeby rejestr był ciągły.
 * Dokument z wpłatami zostaje nietknięty — najpierw trzeba usunąć wpłaty,
 * inaczej w kasie zostałyby pieniądze bez dokumentu.
 */
export type CancelInvoiceResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "HAS_PAYMENTS" }
  | { ok: false; reason: "ALREADY_CANCELLED" };

export async function cancelInvoice(
  organizationId: string,
  invoiceId: string,
): Promise<CancelInvoiceResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true, status: true, _count: { select: { payments: true } } },
  });

  if (!invoice) return { ok: false, reason: "NOT_FOUND" };
  if (invoice.status === "CANCELLED") return { ok: false, reason: "ALREADY_CANCELLED" };
  if (invoice._count.payments > 0) return { ok: false, reason: "HAS_PAYMENTS" };

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED" },
  });

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Naliczanie miesięczne
// ═══════════════════════════════════════════════════════════════════════════

export type GeneratedInvoice = {
  leaseId: string;
  invoiceId: string;
  number: string;
  totalGrossGrosze: number;
};

export type SkippedLease = {
  leaseId: string;
  reason:
    | "ALREADY_INVOICED"
    | "OUTSIDE_LEASE_PERIOD"
    | "NO_TENANT"
    | "NOTHING_TO_BILL"
    | "BILLING_DAY_AHEAD";
};

export type GenerateInvoicesResult = {
  created: GeneratedInvoice[];
  skipped: SkippedLease[];
};

/**
 * Wystawia dokumenty czynszowe za wskazany miesiąc.
 *
 * Idempotentne: umowa, która ma już dokument obejmujący ten okres, jest
 * pomijana. Naliczanie miesięczne odpala cron, a cron potrafi wystrzelić
 * dwa razy — bez tego sprawdzenia najemca dostałby dwa rachunki za sierpień.
 *
 * Rozpoznajemy „ten sam okres" po `periodStart`, a nie po miesiącu wystawienia:
 * umowa zaczynająca się 15 sierpnia ma okres od 15., a nie od 1., i to on
 * jednoznacznie identyfikuje rozliczenie.
 *
 * `notBefore` (przebieg cronowy) pomija umowy, których dzień naliczania jeszcze
 * nie nadszedł — bez tego cron pierwszego dnia miesiąca wystawiłby dokument
 * z datą wystawienia w przyszłości. Wywołanie ręczne go nie podaje: skoro
 * użytkownik prosi o konkretny miesiąc, wystawiamy mimo daty.
 */
export async function generateInvoicesForMonth(
  organizationId: string,
  { year, month, leaseId, tenantId }: GenerateInvoicesOutput,
  options: { notBefore?: Date } = {},
): Promise<GenerateInvoicesResult> {
  // Wejście jest w zapisie ludzkim (1–12), Date liczy miesiące od zera.
  const monthIndex = month - 1;

  const leases = await prisma.lease.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      ...(leaseId ? { id: leaseId } : {}),
      ...(tenantId ? { tenants: { some: { tenantId } } } : {}),
      // Umowa musi zahaczać o ten miesiąc choć jednym dniem.
      startDate: { lt: new Date(Date.UTC(year, monthIndex + 1, 1)) },
      OR: [{ endDate: null }, { endDate: { gte: new Date(Date.UTC(year, monthIndex, 1)) } }],
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      rentGrosze: true,
      utilitiesMode: true,
      utilitiesAdvanceGrosze: true,
      billingDay: true,
      paymentTermDays: true,
      property: { select: { type: true } },
      tenants: {
        orderBy: { isPrimary: "desc" },
        take: 1,
        select: { tenant: true },
      },
    },
  });

  const created: GeneratedInvoice[] = [];
  const skipped: SkippedLease[] = [];

  for (const lease of leases) {
    const billing: BillingLease = {
      startDate: lease.startDate,
      endDate: lease.endDate,
      rentGrosze: lease.rentGrosze,
      utilitiesMode: lease.utilitiesMode,
      utilitiesAdvanceGrosze: lease.utilitiesAdvanceGrosze,
      billingDay: lease.billingDay,
      paymentTermDays: lease.paymentTermDays,
    };

    const period = buildBillingPeriod(billing, year, monthIndex);
    if (!period) {
      skipped.push({ leaseId: lease.id, reason: "OUTSIDE_LEASE_PERIOD" });
      continue;
    }

    if (options.notBefore && period.issueDate > options.notBefore) {
      skipped.push({ leaseId: lease.id, reason: "BILLING_DAY_AHEAD" });
      continue;
    }

    const tenant = lease.tenants[0]?.tenant;
    if (!tenant) {
      skipped.push({ leaseId: lease.id, reason: "NO_TENANT" });
      continue;
    }

    const vatRate = rentVatRate(lease.property.type);
    const lines = buildRentInvoiceLines(billing, period, year, monthIndex, {
      rentVatRate: vatRate,
      utilitiesVatRate: vatRate,
    });

    const { totals, lines: lineData } = linesCreateData(lines);
    if (totals.totalGrossGrosze === 0) {
      skipped.push({ leaseId: lease.id, reason: "NOTHING_TO_BILL" });
      continue;
    }

    // Rodzaj dokumentu bierze się z kartoteki najemcy; „rachunek" oddaje
    // decyzję stawkom VAT.
    const kind = resolveDocumentKind(tenant.documentKind, lines);

    const existing = await prisma.invoice.findFirst({
      where: {
        organizationId,
        leaseId: lease.id,
        periodStart: period.periodStart,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    });
    if (existing) {
      skipped.push({ leaseId: lease.id, reason: "ALREADY_INVOICED" });
      continue;
    }

    const invoice = await withUniqueNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const number = await nextInvoiceNumber(tx, organizationId, kind, period.issueDate);

        return tx.invoice.create({
          data: {
            organizationId,
            leaseId: lease.id,
            status: "ISSUED",
            kind,
            number,
            issueDate: period.issueDate,
            saleDate: period.saleDate,
            dueDate: period.dueDate,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            notes: `Rozliczenie za ${periodLabel(year, monthIndex)}.`,
            ...totals,
            ...buyerSnapshot(tenant),
            lines: { create: lineData },
          },
          select: { id: true, number: true, totalGrossGrosze: true },
        });
      }),
    );

    created.push({
      leaseId: lease.id,
      invoiceId: invoice.id,
      number: invoice.number,
      totalGrossGrosze: invoice.totalGrossGrosze,
    });
  }

  return { created, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════
// Wpłaty
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Przelicza `paidGrosze` i status z faktycznych wpłat.
 *
 * Sumujemy rekordy, zamiast dodawać kwotę do licznika: po usunięciu wpłaty
 * albo po korekcie licznik rozjechałby się z tabelą i nikt by tego nie zauważył.
 * Wołane wewnątrz tej samej transakcji, co zapis wpłaty.
 */
async function recalculateSettlement(tx: Prisma.TransactionClient, invoiceId: string) {
  const [invoice, sum] = await Promise.all([
    tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: { status: true, totalGrossGrosze: true },
    }),
    tx.payment.aggregate({ where: { invoiceId }, _sum: { amountGrosze: true } }),
  ]);

  const paidGrosze = sum._sum.amountGrosze ?? 0;

  return tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidGrosze,
      // Anulowany dokument zostaje anulowany, choćby wpłata do niego wpłynęła —
      // pieniądze trzeba wtedy przepiąć ręcznie, a nie wskrzeszać dokumentu.
      status:
        invoice.status === "CANCELLED"
          ? "CANCELLED"
          : settlementStatus(invoice.totalGrossGrosze, paidGrosze),
    },
    select: { id: true, status: true, paidGrosze: true, totalGrossGrosze: true },
  });
}

export type RecordPaymentResult =
  | { ok: true; payment: { id: string }; invoice: { status: InvoiceStatus; paidGrosze: number } }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "CANCELLED" };

export async function recordPayment(
  organizationId: string,
  invoiceId: string,
  data: PaymentFormOutput,
): Promise<RecordPaymentResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true, status: true },
  });

  if (!invoice) return { ok: false, reason: "NOT_FOUND" };
  if (invoice.status === "CANCELLED") return { ok: false, reason: "CANCELLED" };

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        organizationId,
        invoiceId,
        amountGrosze: data.amountGrosze,
        paidAt: data.paidAt,
        method: data.method,
        reference: data.reference,
        note: data.note,
      },
      select: { id: true },
    });

    const updated = await recalculateSettlement(tx, invoiceId);
    return { payment, updated };
  });

  return {
    ok: true,
    payment: result.payment,
    invoice: { status: result.updated.status, paidGrosze: result.updated.paidGrosze },
  };
}

/** Usunięcie błędnie wpisanej wpłaty. Status dokumentu wraca do stanu sprzed. */
export async function deletePayment(organizationId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId },
    select: { id: true, invoiceId: true },
  });
  if (!payment) return null;

  return prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });
    return recalculateSettlement(tx, payment.invoiceId);
  });
}
