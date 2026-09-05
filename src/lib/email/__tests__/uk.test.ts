import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n";
import {
  invoiceIssuedEmail,
  paymentOverdueEmail,
  paymentReminderEmail,
  type InvoiceEmailData,
} from "@/lib/email/templates";
import { unknownVariables, sampleValues, templateVariables } from "@/lib/email/render";
import { buildRentInvoiceLines, periodLabel } from "@/lib/leases/billing";
import type { BillingLease } from "@/lib/leases/billing";
import { buildBillingPeriod } from "@/lib/leases/billing";

/**
 * Wiadomości do najemcy idą w języku konta wynajmującego.
 *
 * To jedyna część systemu, którą czyta ktoś spoza niego — najemca nigdy się
 * nie loguje i nie ma jak przełączyć języka. Polski mail do brytyjskiego
 * najemcy jest widoczny natychmiast i nie da się go cofnąć.
 */

const BASE: InvoiceEmailData = {
  locale: "uk",
  tenantFirstName: "James",
  tenantLastName: "Doyle",
  landlordName: "Harborne Lettings Ltd",
  invoiceNumber: "INV 6/08/2026",
  amountGrosze: 262900,
  remainingGrosze: 262900,
  dueDate: new Date("2026-08-22T00:00:00Z"),
  periodLabel: "August 2026",
  attached: true,
  propertyAddress: "14 Station Road, Birmingham B17 9LN",
};

describe("wiadomości w wersji brytyjskiej", () => {
  it("wystawienie dokumentu idzie po angielsku i w funtach", () => {
    const mail = invoiceIssuedEmail(BASE);

    expect(mail.subject).toBe("INV 6/08/2026: £2,629.00 due 22 August 2026");
    expect(mail.html).toContain("New invoice");
    expect(mail.html).toContain("Hello James");
    expect(mail.html).toContain("£2,629.00");
    expect(mail.html).toContain('lang="en-GB"');

    // Nic polskiego nie może przeciekać do skrzynki najemcy.
    expect(mail.html).not.toContain("zł");
    expect(mail.html).not.toContain("Dzień dobry");
    expect(mail.text).not.toContain("Rentix</");
  });

  it("przypomnienie i wezwanie też", () => {
    expect(paymentReminderEmail(BASE).subject).toBe("Reminder: INV 6/08/2026, due 22 August 2026");
    expect(paymentOverdueEmail({ ...BASE, daysOverdue: 5 }).subject).toBe(
      "Overdue: INV 6/08/2026, £2,629.00",
    );
  });

  it("odmienia dni po terminie regułami języka, a nie warunkiem na jedynkę", () => {
    const one = paymentOverdueEmail({ ...BASE, daysOverdue: 1 });
    const many = paymentOverdueEmail({ ...BASE, daysOverdue: 5 });

    expect(one.html).toContain("1 day ago");
    expect(many.html).toContain("5 days ago");

    // Polski ma trzecią formę, której warunek „=== 1" nigdy nie trafia.
    const pl = { ...BASE, locale: "pl" as const, tenantFirstName: "Jan" };
    expect(paymentOverdueEmail({ ...pl, daysOverdue: 1 }).html).toContain("1 dzień");
    expect(paymentOverdueEmail({ ...pl, daysOverdue: 22 }).html).toContain("22 dni");
  });

  it("polska wersja zostaje bez zmian", () => {
    const mail = invoiceIssuedEmail({ ...BASE, locale: "pl", tenantFirstName: "Jan" });

    expect(mail.html).toContain("Nowy dokument");
    expect(mail.html).toContain('lang="pl"');
    expect(mail.subject).toContain("zł");
  });
});

describe("zmienne w treści pisanej przez wynajmującego", () => {
  it("mają nazwy w języku konta", () => {
    const names = (locale: "pl" | "uk") =>
      templateVariables(getDictionary(locale)).map((variable) => variable.name);

    expect(names("pl")).toContain("imie_najemcy");
    expect(names("uk")).toContain("tenant_first_name");
    // „imie_najemcy" w angielskim edytorze byłoby zagadką, a nie podpowiedzią.
    expect(names("uk")).not.toContain("imie_najemcy");
  });

  it("podstawiają się pod nazwami swojej wersji", () => {
    const mail = invoiceIssuedEmail(BASE, {
      intro: "Hi {{tenant_first_name}}, {{amount_due}} is due on {{due_date}}.",
    });

    expect(mail.html).toContain("Hi James, £2,629.00 is due on 22 August 2026.");
  });

  it("nazwa z drugiej wersji jest literówką, nie zmienną", () => {
    // Bez tego wynajmujący dowiedziałby się o pomyłce dopiero ze skrzynki
    // najemcy — w miejscu zmiennej byłaby dziura.
    expect(unknownVariables("{{imie_najemcy}}", getDictionary("uk"))).toEqual(["imie_najemcy"]);
    expect(unknownVariables("{{tenant_first_name}}", getDictionary("uk"))).toEqual([]);
  });

  it("wartości podglądu są kompletne w obu wersjach", () => {
    for (const locale of ["pl", "uk"] as const) {
      const d = getDictionary(locale);
      const values = sampleValues(d);

      for (const variable of templateVariables(d)) {
        expect(values[variable.name]).toBeTruthy();
      }
    }
  });
});

describe("pozycje naliczane automatycznie", () => {
  const lease: BillingLease = {
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: null,
    rentGrosze: 240000,
    utilitiesMode: "FLAT_RATE",
    utilitiesAdvanceGrosze: 35000,
    billingDay: 1,
    paymentTermDays: 10,
  };

  it("opisują się w języku konta", () => {
    const period = buildBillingPeriod(lease, 2026, 7)!;

    const uk = buildRentInvoiceLines(lease, period, 2026, 7, getDictionary("uk"), "uk");
    expect(uk[0].description).toBe("Rent for August 2026");
    expect(uk[1].description).toBe("Utilities allowance for August 2026");
    expect(uk[0].unit).toBe("month");

    const pl = buildRentInvoiceLines(lease, period, 2026, 7, getDictionary("pl"), "pl");
    expect(pl[0].description).toBe("Czynsz najmu za sierpień 2026");
    expect(pl[0].unit).toBe("mies.");
  });

  it("nazwa miesiąca też", () => {
    expect(periodLabel(2026, 7, "pl")).toBe("sierpień 2026");
    expect(periodLabel(2026, 7, "uk")).toBe("August 2026");
  });
});
