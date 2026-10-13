import { Lock, LogOut } from "lucide-react";

import { signOutAction } from "@/app/(app)/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/server";

/**
 * Ekran dla konta, któremu odebrano dostęp do organizacji.
 *
 * Token sesji żyje trzydzieści dni i niesie `organizationId` z chwili
 * zalogowania, więc po usunięciu z zespołu użytkownik nadal ma ważną sesję —
 * tylko nie ma już do czego. Przekierowanie na logowanie zapętliłoby się
 * (middleware odsyła zalogowanego z powrotem do panelu), dlatego zamiast
 * przekierowania pokazujemy ścianę z jednym wyjściem: wylogowaniem.
 *
 * Język bierzemy z żądania, a nie z organizacji — tej organizacji użytkownik
 * już nie ma.
 */
export async function AccessRevoked() {
  const d = getDictionary(await requestLocale());

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="px-6 py-6 sm:px-12 sm:py-10">
        <Logo />
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pt-[12vh] pb-16 sm:items-center sm:pt-0">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <span className="flex size-[72px] items-center justify-center rounded-[18px] bg-bad-soft" aria-hidden>
            <Lock className="size-8 text-bad" strokeWidth={1.7} />
          </span>
          <h1 className="r-display text-[30px] leading-9 tracking-[-0.6px] text-fg">{d.panel.team.accessRevokedTitle}</h1>
          <p className="text-[15px] text-muted">{d.panel.api.accessRevoked}</p>
          <form action={signOutAction} className="mt-2">
            <Button type="submit" variant="secondary">
              <LogOut className="size-[18px]" aria-hidden />
              {d.panel.shell.signOut}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
