import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { DateInput, dateTextToIso, formatDateText, isoToDateText } from "@/components/ui/date-input";

describe("formatDateText", () => {
  it("wstawia kropki w trakcie pisania", () => {
    expect(formatDateText("3")).toBe("3");
    expect(formatDateText("310")).toBe("31.0");
    expect(formatDateText("31082026")).toBe("31.08.2026");
  });

  it("nie dopisuje kropki sama z siebie — inaczej nie dałoby się jej skasować", () => {
    expect(formatDateText("31")).toBe("31");
    expect(formatDateText("31.")).toBe("31.");
    expect(formatDateText("3108")).toBe("31.08");
  });

  it("odsiewa litery i cyfry ponad osiem", () => {
    expect(formatDateText("31/08/2026999")).toBe("31.08.2026");
    expect(formatDateText("abc")).toBe("");
  });
});

describe("dateTextToIso", () => {
  it("zamienia dzień-miesiąc-rok na format bazy", () => {
    expect(dateTextToIso("31.08.2026")).toBe("2026-08-31");
  });

  it("nie zwraca niczego dla daty niepełnej albo nieistniejącej", () => {
    expect(dateTextToIso("")).toBe("");
    expect(dateTextToIso("31.08.20")).toBe("");
    expect(dateTextToIso("31.02.2026")).toBe("");
    expect(dateTextToIso("31.13.2026")).toBe("");
    expect(dateTextToIso("00.08.2026")).toBe("");
  });
});

describe("isoToDateText", () => {
  it("pokazuje datę z bazy po polsku", () => {
    expect(isoToDateText("2026-08-31")).toBe("31.08.2026");
    expect(isoToDateText("")).toBe("");
  });
});

describe("DateInput", () => {
  it("oddaje wpisaną datę w formacie ISO", async () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="Data" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Data" }), "31082026");

    expect(screen.getByRole("textbox", { name: "Data" })).toHaveValue("31.08.2026");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe("2026-08-31");
  });

  it("nie kasuje zapisanej daty w połowie poprawiania", async () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="Data" value="2026-08-31" onChange={onChange} />);

    const field = screen.getByRole("textbox", { name: "Data" });
    await userEvent.type(field, "{backspace}{backspace}");

    // Rok w połowie skasowany — do formularza nie leci jeszcze nic.
    expect(field).toHaveValue("31.08.20");
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.type(field, "27");
    expect(onChange.mock.calls[0][0].target.value).toBe("2027-08-31");
  });

  it("czyści datę urwaną w połowie po wyjściu z pola", async () => {
    const onChange = vi.fn();
    render(
      <>
        <DateInput aria-label="Data" onChange={onChange} />
        <button type="button">obok</button>
      </>,
    );

    await userEvent.type(screen.getByRole("textbox", { name: "Data" }), "3108");
    await userEvent.click(screen.getByRole("button", { name: "obok" }));

    expect(screen.getByRole("textbox", { name: "Data" })).toHaveValue("");
    expect(onChange).not.toHaveBeenCalled();
  });

  function Harness({ onValues }: { onValues: (values: { startDate: string }) => void }) {
    const { register, handleSubmit } = useForm({ defaultValues: { startDate: "2026-08-31" } });

    return (
      <form onSubmit={handleSubmit(onValues)}>
        <DateInput aria-label="Data" {...register("startDate")} />
        <button type="submit">Zapisz</button>
      </form>
    );
  }

  it("dogaduje się z react-hook-form: pokazuje wartość domyślną i oddaje ISO", async () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);

    const field = screen.getByRole("textbox", { name: "Data" });
    expect(field).toHaveValue("31.08.2026");

    await userEvent.clear(field);
    await userEvent.type(field, "01092026");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(onValues).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2026-09-01" }),
      expect.anything(),
    );
  });
});
