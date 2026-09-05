import { describe, expect, it } from "vitest";

import {
  escapeHtml,
  renderField,
  renderTemplateText,
  textToHtml,
  unknownVariables,
} from "@/lib/email/render";
import { invoiceIssuedEmail } from "@/lib/email/templates";
import { getDictionary } from "@/lib/i18n";

const VALUES = {
  imie_najemcy: "Jan",
  kwota: "629,03 zł",
  okres: "sierpień 2026",
} as const;

describe("podstawianie zmiennych", () => {
  it("wstawia wartości w miejsce znaczników", () => {
    const result = renderTemplateText("Dzień dobry, {{imie_najemcy}}. Do zapłaty {{kwota}}.", VALUES);

    expect(result).toBe("Dzień dobry, Jan. Do zapłaty 629,03 zł.");
  });

  it("znosi spacje w środku znacznika", () => {
    // Edytor tekstu i kopiowanie z podpowiedzi potrafią je dołożyć, a wynajmujący
    // nie ma powodu podejrzewać, że spacja psuje wiadomość.
    expect(renderTemplateText("{{ imie_najemcy }}", VALUES)).toBe("Jan");
  });

  it("nie zostawia surowego znacznika, gdy wartości brak", () => {
    // Dokument jednorazowy nie ma okresu rozliczeniowego — najemca nie powinien
    // oglądać wnętrza szablonu tylko dlatego, że jedno pole jest puste.
    expect(renderTemplateText("Rozliczenie {{okres}}.", {})).toBe("Rozliczenie .");
  });

  it("wskazuje literówkę w nazwie zmiennej", () => {
    expect(unknownVariables("Witaj {{imie_najmcy}}, {{kwota}}", getDictionary("pl"))).toEqual(["imie_najmcy"]);
  });

  it("nie zgłasza nic, gdy wszystkie nazwy są znane", () => {
    expect(unknownVariables("{{imie_najemcy}} {{termin}}", getDictionary("pl"))).toEqual([]);
  });
});

describe("wstawianie tekstu w HTML", () => {
  it("neutralizuje znaczniki wklejone do pola", () => {
    const html = textToHtml('<script>alert("x")</script>');

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapuje ampersand w nazwie firmy", () => {
    // „Kowalski & Wspólnicy" bez tego rozjeżdża encje u odbiorcy.
    expect(escapeHtml("Kowalski & Wspólnicy")).toBe("Kowalski &amp; Wspólnicy");
  });

  it("zachowuje złamania wierszy jako <br />", () => {
    expect(textToHtml("pierwsza\ndruga")).toBe("pierwsza<br />druga");
  });
});

describe("pole szablonu", () => {
  it("puste i złożone z samych spacji znaczy „użyj domyślnego”", () => {
    expect(renderField("", VALUES)).toBeNull();
    expect(renderField("   ", VALUES)).toBeNull();
    expect(renderField(null, VALUES)).toBeNull();
  });

  it("znacznik bez wartości nie robi z pola pustki udającej treść", () => {
    // Cały tekst to jedna zmienna, której nie ma — po podstawieniu zostaje
    // pustka, więc ma zadziałać domyślka, a nie pusty akapit w wiadomości.
    expect(renderField("{{okres}}", {})).toBeNull();
  });
});

describe("wiadomość z treścią wynajmującego", () => {
  const DATA = {
    locale: "pl" as const,
  tenantFirstName: "Jan",
    landlordName: "Miret sp. z o.o.",
    invoiceNumber: "R 6/08/2026",
    amountGrosze: 62903,
    remainingGrosze: 62903,
    dueDate: new Date(Date.UTC(2026, 7, 22)),
    periodLabel: "sierpień 2026",
    attached: true,
  };

  it("używa tekstu wynajmującego zamiast domyślnego", () => {
    const mail = invoiceIssuedEmail(DATA, {
      subject: "Czynsz {{okres}}",
      intro: "Cześć {{imie_najemcy}}!",
    });

    expect(mail.subject).toBe("Czynsz sierpień 2026");
    expect(mail.html).toContain("Cześć Jan!");
    expect(mail.text).toContain("Cześć Jan!");
  });

  it("zostawia domyślki w polach, których nikt nie tknął", () => {
    const mail = invoiceIssuedEmail(DATA, { subject: "Czynsz" });

    expect(mail.subject).toBe("Czynsz");
    expect(mail.html).toContain("Nowy dokument");
  });

  it("nie wpuszcza znaczników z pola edytora do wiadomości", () => {
    const mail = invoiceIssuedEmail(DATA, { intro: "<b>pogrubione</b>" });

    expect(mail.html).not.toContain("<b>pogrubione</b>");
    expect(mail.html).toContain("&lt;b&gt;");
  });
});
