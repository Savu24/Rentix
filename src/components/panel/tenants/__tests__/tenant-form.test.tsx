import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TenantForm } from "@/components/panel/tenants/tenant-form";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/api/client", () => ({
  api: { post: vi.fn(), patch: vi.fn() },
  // Woła go `I18nProvider` przy montowaniu formularza.
  setTransportMessages: vi.fn(),
}));

/**
 * Formularz czyta teksty z kontekstu, więc test podaje wersję polską — to na
 * niej opisane są etykiety, których szukamy niżej.
 */
function renderForm() {
  return render(
    <I18nProvider locale="pl" dictionary={getDictionary("pl")}>
      <TenantForm />
    </I18nProvider>,
  );
}

/**
 * Adres zameldowania i dane nabywcy mają te same etykiety — pierwszy komplet
 * pól to zameldowanie (stoi wyżej w formularzu), drugi to faktura.
 */
const registered = (label: string) => screen.getAllByLabelText(label)[0];
const billing = (label: string) => screen.getAllByLabelText(label)[1];

describe("TenantForm — dane do faktury", () => {
  it("przepisuje adres zameldowania do danych nabywcy", async () => {
    renderForm();

    await userEvent.type(registered("Ulica i numer"), "Kwiatowa 4/2");
    await userEvent.type(registered("Kod pocztowy"), "03133");
    await userEvent.type(registered("Miejscowość"), "Warszawa");

    await userEvent.click(screen.getByRole("button", { name: "Skopiuj adres zameldowania" }));

    expect(billing("Ulica i numer")).toHaveValue("Kwiatowa 4/2");
    expect(billing("Kod pocztowy")).toHaveValue("03-133");
    expect(billing("Miejscowość")).toHaveValue("Warszawa");
  });

  it("bez adresu zameldowania nie ma czego kopiować", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Skopiuj adres zameldowania" })).toBeDisabled();
  });
});
