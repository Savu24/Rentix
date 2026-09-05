import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { calculateInvoiceTotals } from "../src/lib/invoices/totals";
import { getDictionary } from "../src/lib/i18n";
import {
  buildBillingPeriod,
  buildRentInvoiceLines,
  type BillingLease,
} from "../src/lib/leases/billing";

/**
 * Dane demonstracyjne.
 *
 * Model: nieruchomość JEST przedmiotem najmu, a pokoje wiszą bezpośrednio pod
 * nią. Seed pokazuje oba tryby — najem całości i najem pokój po pokoju.
 *
 * Skrypt jest idempotentny: kasuje wcześniejsze dane demo tej organizacji
 * i tworzy je od nowa. Kasowanie idzie po `organizationId`, więc nigdy nie
 * dotknie danych innego konta.
 *
 * Faktury nie są wpisywane ręcznie — powstają przez `buildRentInvoiceLines`
 * i `calculateInvoiceTotals`, czyli tę samą logikę, której użyje aplikacja.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_OWNER_EMAIL = "aleksandra@przyklad.pl";
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main() {
  const owner = await prisma.user.findUnique({
    where: { email: DEMO_OWNER_EMAIL },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  if (!owner?.memberships[0]) {
    throw new Error(
      `Nie znaleziono konta ${DEMO_OWNER_EMAIL} z organizacją.\n` +
        `Załóż je najpierw przez formularz rejestracji na /rejestracja.`,
    );
  }

  const organizationId = owner.memberships[0].organizationId;
  console.log(`Organizacja: ${organizationId}`);

  // ── czyszczenie ───────────────────────────────────────────────────────────
  // Kolejność wymuszona kluczami obcymi z onDelete: Restrict.
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { organizationId } }),
    prisma.invoiceLine.deleteMany({ where: { invoice: { organizationId } } }),
    prisma.invoice.deleteMany({ where: { organizationId } }),
    prisma.message.deleteMany({ where: { organizationId } }),
    prisma.messageThread.deleteMany({ where: { organizationId } }),
    prisma.maintenancePhoto.deleteMany({ where: { request: { organizationId } } }),
    prisma.maintenanceRequest.deleteMany({ where: { organizationId } }),
    prisma.meterReading.deleteMany({ where: { organizationId } }),
    prisma.document.deleteMany({ where: { organizationId } }),
    prisma.notification.deleteMany({ where: { organizationId } }),
    prisma.leaseTenant.deleteMany({ where: { lease: { organizationId } } }),
    prisma.lease.deleteMany({ where: { organizationId } }),
    // Po umowach: Lease.room i Lease.property mają onDelete: Restrict.
    prisma.room.deleteMany({ where: { organizationId } }),
    prisma.tenant.deleteMany({ where: { organizationId } }),
    prisma.propertyPhoto.deleteMany({ where: { property: { organizationId } } }),
    prisma.property.deleteMany({ where: { organizationId } }),
  ]);
  console.log("Wyczyszczono poprzednie dane demo.");

  await prisma.subscription.upsert({
    where: { organizationId },
    create: { organizationId, plan: "PORTFOLIO", status: "ACTIVE", leaseLimit: null },
    update: { plan: "PORTFOLIO", status: "ACTIVE", leaseLimit: null },
  });

  // ── nieruchomości z pokojami ──────────────────────────────────────────────
  const propertySpecs = [
    {
      name: "Kwiatowa 4/2",
      street: "Kwiatowa", buildingNumber: "4", apartmentNumber: "2", postalCode: "30-001", city: "Kraków", district: "Podgórze",
      type: "APARTMENT" as const, areaM2: "48.50", floor: 1, askingRentGrosze: 240000,
      rooms: [{ name: "Pokój 1", rent: 130000 }, { name: "Pokój 2", rent: 110000 }],
    },
    {
      name: "Leśna 12",
      street: "Leśna", buildingNumber: "12", apartmentNumber: "5", postalCode: "30-002", city: "Kraków", district: "Krowodrza",
      type: "APARTMENT" as const, areaM2: "62.00", floor: 2, askingRentGrosze: 310000,
      rooms: [{ name: "Pokój 1", rent: 120000 }, { name: "Pokój 2", rent: 110000 }, { name: "Pokój 3", rent: 105000 }],
    },
    {
      name: "Polna 8/1",
      street: "Polna", buildingNumber: "8", apartmentNumber: "1", postalCode: "32-020", city: "Wieliczka", district: null,
      type: "APARTMENT" as const, areaM2: "38.20", floor: 0, askingRentGrosze: 185000,
      rooms: [{ name: "Pokój 1", rent: 185000 }],
    },
    {
      // Najem pokojowy — trzy osobne stawki, dwa pokoje zajęte.
      name: "Ogrodowa 3",
      street: "Ogrodowa", buildingNumber: "3", apartmentNumber: null, postalCode: "30-003", city: "Kraków", district: "Bronowice",
      type: "HOUSE" as const, areaM2: "110.00", floor: 0, askingRentGrosze: 270000,
      rooms: [
        { name: "Pokój 1", rent: 90000 },
        { name: "Pokój 2", rent: 85000 },
        { name: "Pokój 3", rent: 95000 },
        { name: "Pokój 4", rent: 90000 },
      ],
    },
  ];

  const properties: Array<{ id: string; name: string; rooms: Array<{ id: string; name: string }> }> = [];

  for (const spec of propertySpecs) {
    const property = await prisma.property.create({
      data: {
        organizationId,
        name: spec.name,
        type: spec.type,
        street: spec.street,
        buildingNumber: spec.buildingNumber,
        apartmentNumber: spec.apartmentNumber,
        postalCode: spec.postalCode,
        city: spec.city,
        district: spec.district,
        areaM2: spec.areaM2,
        floor: spec.floor,
        askingRentGrosze: spec.askingRentGrosze,
        publiclyListed: true,
        rooms: {
          create: spec.rooms.map((room, index) => ({
            organizationId,
            name: room.name,
            position: index,
            monthlyRentGrosze: room.rent,
          })),
        },
      },
      include: { rooms: { orderBy: { position: "asc" } } },
    });

    properties.push({
      id: property.id,
      name: property.name,
      rooms: property.rooms.map((room) => ({ id: room.id, name: room.name })),
    });
  }
  const roomTotal = properties.reduce((sum, p) => sum + p.rooms.length, 0);
  console.log(`Utworzono ${properties.length} nieruchomości i ${roomTotal} pokoi.`);

  // ── najemcy ───────────────────────────────────────────────────────────────
  const tenantSpecs = [
    { firstName: "Jan", lastName: "Kowalski", email: "jan.kowalski@przyklad.pl", phone: "+48 601 100 200", city: "Kraków", street: "Kwiatowa 4/2", postalCode: "30-001" },
    { firstName: "Anna", lastName: "Nowak", email: "anna.nowak@przyklad.pl", phone: "+48 602 200 300", city: "Kraków", street: "Leśna 12", postalCode: "30-002" },
    { firstName: "Piotr", lastName: "Zieliński", email: "piotr.zielinski@przyklad.pl", phone: "+48 603 300 400", city: "Wieliczka", street: "Polna 8/1", postalCode: "32-020" },
    { firstName: "Marta", lastName: "Lis", email: "marta.lis@przyklad.pl", phone: "+48 604 400 500", city: "Kraków", street: "Ogrodowa 3", postalCode: "30-003" },
    { firstName: "Rafał", lastName: "Dąb", email: "rafal.dab@przyklad.pl", phone: "+48 605 500 600", city: "Kraków", street: "Ogrodowa 3", postalCode: "30-003" },
  ];

  const tenants = [];
  for (const spec of tenantSpecs) {
    tenants.push(await prisma.tenant.create({ data: { organizationId, status: "ACTIVE", ...spec } }));
  }
  console.log(`Utworzono ${tenants.length} najemców.`);

  // ── umowy ─────────────────────────────────────────────────────────────────
  // Trzy pierwsze: najem całości. Dwie ostatnie: pojedyncze pokoje w Ogrodowej.
  const leaseSpecs: Array<{
    propertyIndex: number;
    /** NULL = cała nieruchomość. */
    roomIndex: number | null;
    tenantIndex: number;
    lease: BillingLease;
    months: number;
    paidThrough: number;
  }> = [
    {
      propertyIndex: 0, roomIndex: null, tenantIndex: 0, months: 6, paidThrough: 5,
      lease: { startDate: utc("2025-09-01"), endDate: utc("2026-08-31"), rentGrosze: 240000, utilitiesMode: "FLAT_RATE", utilitiesAdvanceGrosze: 45000, billingDay: 1, paymentTermDays: 10 },
    },
    {
      propertyIndex: 1, roomIndex: null, tenantIndex: 1, months: 6, paidThrough: 6,
      lease: { startDate: utc("2025-06-15"), endDate: null, rentGrosze: 310000, utilitiesMode: "MIXED", utilitiesAdvanceGrosze: 38000, billingDay: 5, paymentTermDays: 14 },
    },
    {
      // Ta umowa ma zaległość — ostatnie dwie faktury nieopłacone.
      propertyIndex: 2, roomIndex: null, tenantIndex: 2, months: 6, paidThrough: 4,
      lease: { startDate: utc("2025-11-01"), endDate: null, rentGrosze: 185000, utilitiesMode: "INCLUDED", utilitiesAdvanceGrosze: 0, billingDay: 10, paymentTermDays: 7 },
    },
    {
      propertyIndex: 3, roomIndex: 0, tenantIndex: 3, months: 5, paidThrough: 5,
      lease: { startDate: utc("2026-03-01"), endDate: null, rentGrosze: 90000, utilitiesMode: "INCLUDED", utilitiesAdvanceGrosze: 0, billingDay: 1, paymentTermDays: 10 },
    },
    {
      propertyIndex: 3, roomIndex: 1, tenantIndex: 4, months: 5, paidThrough: 4,
      lease: { startDate: utc("2026-03-01"), endDate: null, rentGrosze: 85000, utilitiesMode: "INCLUDED", utilitiesAdvanceGrosze: 0, billingDay: 1, paymentTermDays: 10 },
    },
  ];

  let invoiceCount = 0;
  let paymentCount = 0;
  let invoiceSeq = 0;

  for (const spec of leaseSpecs) {
    const property = properties[spec.propertyIndex]!;
    const room = spec.roomIndex !== null ? property.rooms[spec.roomIndex]! : null;
    const tenant = tenants[spec.tenantIndex]!;

    const lease = await prisma.lease.create({
      data: {
        organizationId,
        propertyId: property.id,
        roomId: room?.id ?? null,
        status: "ACTIVE",
        number: `${new Date(spec.lease.startDate).getUTCFullYear()}/${String(invoiceSeq + 1).padStart(3, "0")}`,
        startDate: spec.lease.startDate,
        endDate: spec.lease.endDate,
        rentGrosze: spec.lease.rentGrosze,
        depositGrosze: spec.lease.rentGrosze,
        utilitiesMode: spec.lease.utilitiesMode,
        utilitiesAdvanceGrosze: spec.lease.utilitiesAdvanceGrosze,
        billingDay: spec.lease.billingDay,
        paymentTermDays: spec.lease.paymentTermDays,
        tenants: { create: { tenantId: tenant.id, isPrimary: true } },
      },
    });

    // Zajmujemy pokój albo całą nieruchomość.
    if (room) {
      await prisma.room.update({ where: { id: room.id }, data: { status: "OCCUPIED" } });
    } else {
      await prisma.property.update({ where: { id: property.id }, data: { status: "OCCUPIED" } });
      await prisma.room.updateMany({ where: { propertyId: property.id }, data: { status: "OCCUPIED" } });
    }

    for (let back = spec.months - 1; back >= 0; back--) {
      const anchor = new Date(Date.UTC(2026, 7 - back, 1));
      const year = anchor.getUTCFullYear();
      const month = anchor.getUTCMonth();

      const period = buildBillingPeriod(spec.lease, year, month);
      if (!period) continue;

      const lines = buildRentInvoiceLines(spec.lease, period, year, month, getDictionary("pl"), "pl");
      const totals = calculateInvoiceTotals(lines);

      const issuedIndex = spec.months - 1 - back;
      const isPaid = issuedIndex < spec.paidThrough;
      invoiceSeq += 1;

      const invoice = await prisma.invoice.create({
        data: {
          organizationId,
          leaseId: lease.id,
          status: isPaid ? "PAID" : "ISSUED",
          kind: "BILL",
          number: `FV/${year}/${String(month + 1).padStart(2, "0")}/${String(invoiceSeq).padStart(3, "0")}`,
          issueDate: period.issueDate,
          saleDate: period.saleDate,
          dueDate: period.dueDate,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          totalNetGrosze: totals.totalNetGrosze,
          totalVatGrosze: totals.totalVatGrosze,
          totalGrossGrosze: totals.totalGrossGrosze,
          paidGrosze: isPaid ? totals.totalGrossGrosze : 0,
          // Migawka danych nabywcy — kopiowana, nie czytana przez relację.
          buyerName: `${tenant.firstName} ${tenant.lastName}`,
          buyerStreet: tenant.street,
          buyerPostalCode: tenant.postalCode,
          buyerCity: tenant.city,
          lines: {
            create: totals.lines.map((line, position) => ({
              description: line.description,
              quantity: (line.quantityMilli / 1000).toFixed(3),
              unit: line.unit ?? "szt.",
              unitPriceNetGrosze: line.unitPriceNetGrosze,
              vatRate: line.vatRate,
              netGrosze: line.netGrosze,
              vatGrosze: line.vatGrosze,
              grossGrosze: line.grossGrosze,
              position,
            })),
          },
        },
      });
      invoiceCount += 1;

      if (isPaid) {
        await prisma.payment.create({
          data: {
            organizationId,
            invoiceId: invoice.id,
            amountGrosze: totals.totalGrossGrosze,
            paidAt: new Date(period.dueDate.getTime() - 2 * 24 * 60 * 60 * 1000),
            method: "TRANSFER",
            reference: `Czynsz ${invoice.number}`,
          },
        });
        paymentCount += 1;
      }
    }
  }
  console.log(`Utworzono ${leaseSpecs.length} umów, ${invoiceCount} faktur i ${paymentCount} wpłat.`);

  // ── zgłoszenia usterek ────────────────────────────────────────────────────
  const requestSpecs = [
    { propertyIndex: 0, roomIndex: 0, tenantIndex: 0, title: "Cieknący kran w łazience", description: "Kapie z baterii umywalkowej, mimo dokręcenia.", status: "IN_PROGRESS" as const, priority: "NORMAL" as const },
    { propertyIndex: 2, roomIndex: null, tenantIndex: 2, title: "Awaria ogrzewania", description: "Kaloryfery zimne w całym mieszkaniu od wczoraj.", status: "NEW" as const, priority: "URGENT" as const },
    { propertyIndex: 1, roomIndex: null, tenantIndex: 1, title: "Wymiana zamka w drzwiach", description: "Klucz zacina się przy przekręcaniu.", status: "NEW" as const, priority: "LOW" as const },
    { propertyIndex: 3, roomIndex: 0, tenantIndex: 3, title: "Przegląd kominiarski", description: "Roczny przegląd — wykonany.", status: "RESOLVED" as const, priority: "NORMAL" as const },
  ];

  for (const spec of requestSpecs) {
    const property = properties[spec.propertyIndex]!;
    await prisma.maintenanceRequest.create({
      data: {
        organizationId,
        propertyId: property.id,
        roomId: spec.roomIndex !== null ? property.rooms[spec.roomIndex]!.id : null,
        tenantId: tenants[spec.tenantIndex]!.id,
        title: spec.title,
        description: spec.description,
        status: spec.status,
        priority: spec.priority,
        costGrosze: spec.status === "RESOLVED" ? 18000 : null,
        resolvedAt: spec.status === "RESOLVED" ? utc("2026-07-20") : null,
      },
    });
  }
  console.log(`Utworzono ${requestSpecs.length} zgłoszeń usterek.`);

  // ── odczyty liczników ─────────────────────────────────────────────────────
  const readings = [
    { propertyIndex: 0, meterType: "COLD_WATER" as const, values: ["112.480", "116.715", "121.002"] },
    { propertyIndex: 0, meterType: "ELECTRICITY" as const, values: ["4821.000", "4998.000", "5177.000"] },
    { propertyIndex: 1, meterType: "COLD_WATER" as const, values: ["88.100", "92.340", "96.880"] },
  ];

  let readingCount = 0;
  for (const meter of readings) {
    for (const [index, value] of meter.values.entries()) {
      await prisma.meterReading.create({
        data: {
          organizationId,
          propertyId: properties[meter.propertyIndex]!.id,
          meterType: meter.meterType,
          value,
          readAt: new Date(Date.UTC(2026, 5 + index, 1)),
          source: index === meter.values.length - 1 ? "TENANT" : "OWNER",
        },
      });
      readingCount += 1;
    }
  }
  console.log(`Utworzono ${readingCount} odczytów liczników.`);

  // ── wątek komunikacji ─────────────────────────────────────────────────────
  await prisma.messageThread.create({
    data: {
      organizationId,
      tenantId: tenants[0]!.id,
      subject: "Termin przeglądu",
      lastMessageAt: utc("2026-08-14"),
      messages: {
        create: [
          { organizationId, senderUserId: owner.id, body: "Dzień dobry, przegląd kominiarski planuję na 20 lipca. Pasuje?", readAt: utc("2026-08-13"), createdAt: utc("2026-08-12") },
          { organizationId, senderUserId: owner.id, body: "Potwierdzam termin — kominiarz będzie o 10:00.", createdAt: utc("2026-08-14") },
        ],
      },
    },
  });

  // ── podsumowanie ──────────────────────────────────────────────────────────
  const [invoices, unpaid, occupiedRooms, allRooms] = await Promise.all([
    prisma.invoice.count({ where: { organizationId } }),
    prisma.invoice.aggregate({
      where: { organizationId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      _sum: { totalGrossGrosze: true, paidGrosze: true },
    }),
    prisma.room.count({ where: { organizationId, status: "OCCUPIED" } }),
    prisma.room.count({ where: { organizationId } }),
  ]);

  const outstanding = (unpaid._sum.totalGrossGrosze ?? 0) - (unpaid._sum.paidGrosze ?? 0);

  console.log("\n── gotowe ──");
  console.log(`  faktur łącznie:      ${invoices}`);
  console.log(`  nierozliczone:       ${(outstanding / 100).toFixed(2)} zł`);
  console.log(`  pokoje zajęte:       ${occupiedRooms}/${allRooms}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
