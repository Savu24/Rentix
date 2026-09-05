import { describe, expect, it } from "vitest";

import { invoiceIssuedEmail, paymentOverdueEmail } from "@/lib/email/templates";

const DATA = {
  locale: "pl" as const,
  tenantFirstName: "Jan",
  landlordName: "Miret sp. zoo",
  invoiceNumber: "R 6/08/2026",
  amountGrosze: 62903,
  remainingGrosze: 62903,
  dueDate: new Date(Date.UTC(2026, 7, 22)),
  periodLabel: "sierpień 2026",
  attached: true,
};

describe("wiadomości do najemcy", () => {
  it("nie prowadzą do panelu właściciela", () => {
    // Najemca nie ma tam konta — dawny przycisk odsyłał go na ekran logowania,
    // więc każda wiadomość była dla niego ślepym zaułkiem.
    const mail = invoiceIssuedEmail(DATA);

    expect(mail.html).not.toContain("/panel/");
    expect(mail.text).not.toContain("/panel/");
  });

  it("zapowiadają załącznik, gdy PDF jedzie z wiadomością", () => {
    const mail = invoiceIssuedEmail(DATA);

    expect(mail.html).toContain("załączniku");
    expect(mail.text).toContain("załączniku");
  });

  it("bez załącznika nie obiecują pliku", () => {
    const mail = paymentOverdueEmail({ ...DATA, attached: false, daysOverdue: 5 });

    expect(mail.html).not.toContain("załączniku");
    expect(mail.text).not.toContain("załączniku");
  });

  it("niosą numer, kwotę i imię najemcy", () => {
    const mail = invoiceIssuedEmail(DATA);

    expect(mail.subject).toContain("R 6/08/2026");
    expect(mail.html).toContain("629,03");
    expect(mail.text).toContain("Jan");
  });
});
