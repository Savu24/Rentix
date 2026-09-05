"use server";

import { signOut } from "@/lib/auth";
import { publicRoutes } from "@/lib/auth/routes";
import { requestLocale } from "@/lib/i18n/server";

/**
 * Wylogowanie jako Server Action, a nie zwykły POST z formularza — Next.js
 * sam dokłada token akcji, więc ciasteczko sesji nie da się usunąć żądaniem
 * z obcej strony (CSRF).
 */
export async function signOutAction() {
  // Po wylogowaniu wracamy na stronę główną tej wersji krajowej, którą
  // użytkownik ma zapamiętaną — a nie na goły korzeń, który i tak zaraz
  // przekierowuje.
  await signOut({ redirectTo: publicRoutes(await requestLocale()).home });
}
