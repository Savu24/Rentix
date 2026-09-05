import { describe, expect, it } from "vitest";

import {
  describeRecurrence,
  expenseCategoryLabels,
  EXPENSE_CATEGORY_ORDER,
  expenseRecurrenceLabels,
  EXPENSE_RECURRENCE_ORDER,
  expenseFormSchema,
  expenseUpdateSchema,
} from "@/lib/validations/expense";

import { localeContext } from "@/lib/i18n";

/*
  Schematy są fabrykami zależnymi od kraju, więc test podaje im kontekst wprost.
  Sprawdzamy na wersji polskiej — reguły brytyjskie mają własne przypadki.
*/
const C = localeContext("pl");
const D = C.d;

const VALID = {
  category: "COMMUNITY_FEE" as const,
  amountGrosze: "450,00",
  paidAt: "2026-08-10",
  description: "Czynsz do wspólnoty za sierpień",
};

describe("expenseFormSchema", () => {
  it("przelicza kwotę na grosze", () => {
    expect(expenseFormSchema(C).parse(VALID).amountGrosze).toBe(45000);
  });

  it("odrzuca kwotę zerową i ujemną", () => {
    expect(expenseFormSchema(C).safeParse({ ...VALID, amountGrosze: "0" }).success).toBe(false);
    expect(expenseFormSchema(C).safeParse({ ...VALID, amountGrosze: "-10" }).success).toBe(false);
  });

  it("wymaga opisu — bez niego zestawienie jest nieczytelne", () => {
    expect(expenseFormSchema(C).safeParse({ ...VALID, description: "  " }).success).toBe(false);
  });

  it("buduje datę w UTC, niezależnie od strefy serwera", () => {
    expect(expenseFormSchema(C).parse(VALID).paidAt.toISOString()).toBe("2026-08-10T00:00:00.000Z");
  });

  it("puste pole nieruchomości oznacza koszt ogólny", () => {
    expect(expenseFormSchema(C).parse(VALID).propertyId).toBeNull();
    expect(expenseFormSchema(C).parse({ ...VALID, propertyId: "" }).propertyId).toBeNull();
    expect(expenseFormSchema(C).parse({ ...VALID, propertyId: "prop_1" }).propertyId).toBe("prop_1");
  });

  it("domyślną kategorią jest 'Inne'", () => {
    const withoutCategory = {
      amountGrosze: VALID.amountGrosze,
      paidAt: VALID.paidAt,
      description: VALID.description,
    };
    expect(expenseFormSchema(C).parse(withoutCategory).category).toBe("OTHER");
  });

  it("puste pola opcjonalne dają null, nie pusty string", () => {
    const result = expenseFormSchema(C).parse({ ...VALID, vendor: "", documentRef: "", notes: "" });
    expect(result.vendor).toBeNull();
    expect(result.documentRef).toBeNull();
    expect(result.notes).toBeNull();
  });
});

describe("koszt cykliczny", () => {
  it("bez zaznaczonego checkboxa nie zapisuje cyklu", () => {
    // Samo pole wyboru zostaje wypełnione domyślną wartością, więc gdyby
    // decydowało ono, każdy koszt naliczałby się co miesiąc.
    const result = expenseFormSchema(C).parse({ ...VALID, recurrence: "MONTHLY" });
    expect(result.recurrence).toBeNull();
  });

  it("zaznaczony checkbox zapisuje wybrany cykl", () => {
    const result = expenseFormSchema(C).parse({
      ...VALID,
      recurring: true,
      recurrence: "YEARLY",
    });
    expect(result.recurrence).toBe("YEARLY");
  });

  it("bez wybranego cyklu przyjmuje miesiąc", () => {
    expect(expenseFormSchema(C).parse({ ...VALID, recurring: true }).recurrence).toBe("MONTHLY");
  });

  it("cykl niestandardowy wymaga liczby dni", () => {
    const result = expenseFormSchema(C).safeParse({
      ...VALID,
      recurring: true,
      recurrence: "CUSTOM",
    });
    expect(result.success).toBe(false);
  });

  it("liczba dni zostaje wyłącznie przy cyklu niestandardowym", () => {
    const custom = expenseFormSchema(C).parse({
      ...VALID,
      recurring: true,
      recurrence: "CUSTOM",
      recurrenceEveryDays: "90",
    });
    expect(custom.recurrenceEveryDays).toBe(90);

    const monthly = expenseFormSchema(C).parse({
      ...VALID,
      recurring: true,
      recurrence: "MONTHLY",
      recurrenceEveryDays: "90",
    });
    expect(monthly.recurrenceEveryDays).toBeNull();
  });

  it("nie przepuszcza pola formularza do kolumn", () => {
    // `recurring` istnieje tylko po to, by odznaczenie checkboxa dało się
    // odróżnić od braku pola — w bazie nie ma takiej kolumny.
    expect(expenseFormSchema(C).parse({ ...VALID, recurring: true })).not.toHaveProperty(
      "recurring",
    );
  });

  it("opis cyklu bierze liczbę dni tylko z niestandardowego", () => {
    expect(describeRecurrence("MONTHLY", null, D)).toBe("co miesiąc");
    expect(describeRecurrence("CUSTOM", 90, D)).toBe("co 90 dni");
  });
});

describe("katalog kategorii", () => {
  it("kolejność na liście pokrywa wszystkie kategorie", () => {
    // Kategoria pominięta w kolejności zniknęłaby z listy wyboru, choć dalej
    // istniałaby w bazie — i nie dałoby się jej wpisać.
    const labelled = Object.keys(expenseCategoryLabels(D)).sort();
    expect([...EXPENSE_CATEGORY_ORDER].sort()).toEqual(labelled);
  });

  it("nie powtarza pozycji", () => {
    expect(new Set(EXPENSE_CATEGORY_ORDER).size).toBe(EXPENSE_CATEGORY_ORDER.length);
  });

  it("kolejność cykli pokrywa wszystkie wartości", () => {
    const labelled = Object.keys(expenseRecurrenceLabels(D)).sort();
    expect([...EXPENSE_RECURRENCE_ORDER].sort()).toEqual(labelled);
  });
});

describe("expenseUpdateSchema — edycja wpisanego kosztu", () => {
  it("przyjmuje komplet pól tak, jak wysyła je formularz edycji", () => {
    const result = expenseUpdateSchema(C).parse({
      ...VALID,
      amountGrosze: "480,00",
      vendor: "Wspólnota Kwiatowa 4",
      recurring: false,
    });

    expect(result.amountGrosze).toBe(48000);
    expect(result.vendor).toBe("Wspólnota Kwiatowa 4");
  });

  it("odznaczony checkbox kasuje cykl, zamiast zostawiać go po staremu", () => {
    // Formularz edycji zawsze wysyła `recurring`, więc odznaczenie musi
    // dojechać do bazy jako `null` — inaczej koszt naliczałby się dalej.
    const result = expenseUpdateSchema(C).parse({ ...VALID, recurring: false });
    expect(result.recurrence).toBeNull();
    expect(result.recurrenceEveryDays).toBeNull();
  });

  it("zaznaczony cykl zapisuje razem z odstępem tylko przy niestandardowym", () => {
    expect(
      expenseUpdateSchema(C).parse({
        ...VALID,
        recurring: true,
        recurrence: "MONTHLY",
        recurrenceEveryDays: "90",
      }).recurrenceEveryDays,
    ).toBeNull();

    expect(
      expenseUpdateSchema(C).parse({
        ...VALID,
        recurring: true,
        recurrence: "CUSTOM",
        recurrenceEveryDays: "90",
      }).recurrenceEveryDays,
    ).toBe(90);
  });

  it("cykl niestandardowy bez liczby dni nie przechodzi", () => {
    expect(
      expenseUpdateSchema(C).safeParse({ ...VALID, recurring: true, recurrence: "CUSTOM" }).success,
    ).toBe(false);
  });
});
