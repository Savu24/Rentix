"use server";

import { signOut } from "@/lib/auth";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Wylogowanie jako Server Action, a nie zwykły POST z formularza — Next.js
 * sam dokłada token akcji, więc ciasteczko sesji nie da się usunąć żądaniem
 * z obcej strony (CSRF).
 */
export async function signOutAction() {
  await signOut({ redirectTo: ROUTES.home });
}
