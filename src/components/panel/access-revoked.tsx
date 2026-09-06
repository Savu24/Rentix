import { LogOut, ShieldOff } from "lucide-react";

import { signOutAction } from "@/app/(app)/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <header className="border-b border-border px-4 py-3 sm:px-6">
        <Logo size="sm" />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-10 sm:px-6">
        <Card className="w-full">
          <CardContent className="flex flex-col items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt">
              <ShieldOff className="h-4.5 w-4.5 text-muted" aria-hidden />
            </span>

            <h1 className="r-display text-[22px] leading-tight text-fg">
              {d.panel.team.accessRevokedTitle}
            </h1>
            <p className="text-sm text-muted">{d.panel.api.accessRevoked}</p>

            <form action={signOutAction}>
              <Button type="submit" size="sm" variant="secondary">
                <LogOut className="h-4 w-4" aria-hidden />
                {d.panel.shell.signOut}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
