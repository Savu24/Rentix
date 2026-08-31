import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TenantForm } from "@/components/panel/tenants/tenant-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/api/client", () => ({
  api: { post: vi.fn(), patch: vi.fn() },
}));

/**
 * Adres zameldowania i dane nabywcy mają te same etykiety — pierwszy komplet
 * pól to zameldowanie (stoi wyżej w formularzu), drugi to faktura.
 */
const registered = (label: string) => screen.getAllByLabelText(label)[0];
const billing = (label: string) => screen.getAllByLabelText(label)[1];

describe("TenantForm — dane do faktury", () => {
  it("przepisuje adres zameldowania do danych nabywcy", async () => {
    render(<TenantForm />);

    await userEvent.type(registered("Ulica i numer"), "Kwiatowa 4/2");
    await userEvent.type(registered("Kod pocztowy"), "03133");
    await userEvent.type(registered("Miejscowość"), "Warszawa");

    await userEvent.click(screen.getByRole("button", { name: "Skopiuj adres zameldowania" }));

    expect(billing("Ulica i numer")).toHaveValue("Kwiatowa 4/2");
    expect(billing("Kod pocztowy")).toHaveValue("03-133");
    expect(billing("Miejscowość")).toHaveValue("Warszawa");
  });

  it("bez adresu zameldowania nie ma czego kopiować", () => {
    render(<TenantForm />);
    expect(screen.getByRole("button", { name: "Skopiuj adres zameldowania" })).toBeDisabled();
  });
});
