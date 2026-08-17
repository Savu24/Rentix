import type { Session } from "next-auth";
import { describe, expect, expectTypeOf, it } from "vitest";

import { UserRole } from "@/generated/prisma/enums";

/**
 * `src/types/next-auth.d.ts` powtarza role jako unię literałów, bo plik
 * deklaracji nie może importować wygenerowanego klienta Prismy. Ten test
 * pilnuje, żeby obie listy nie rozjechały się po dodaniu roli do schematu.
 */
describe("role w sesji vs enum w schemacie Prismy", () => {
  it("zawiera dokładnie te same wartości", () => {
    const fromSchema = Object.values(UserRole).sort();
    const fromSessionType = ["ADMIN", "OWNER", "TENANT"];

    expect(fromSchema).toEqual(fromSessionType);
  });

  it("typ roli w sesji akceptuje każdą wartość z enuma", () => {
    expectTypeOf<UserRole>().toExtend<Session["user"]["role"]>();
    expectTypeOf<Session["user"]["role"]>().toExtend<UserRole>();
  });
});
