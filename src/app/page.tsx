import { redirect } from "next/navigation";

import { publicRoutes } from "@/lib/auth/routes";
import { requestLocale } from "@/lib/i18n/server";

/**
 * Goły `rentixon.com` nie ma własnej treści — odsyła na wersję krajową
 * odwiedzającego.
 *
 * Robi to już middleware, więc do tego komponentu w normalnym ruchu nikt nie
 * dochodzi. Zostaje jako zabezpieczenie na wypadek żądania, którego matcher
 * middleware'u nie objął: bez niego korzeń domeny byłby czterysta czwórką.
 */
export default async function RootPage() {
  redirect(publicRoutes(await requestLocale()).home);
}
