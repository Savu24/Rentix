import type { Metadata } from "next";

import { LoginView, type LoginSearchParams } from "@/components/auth/login-view";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary("pl").auth.login;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  // Formularz logowania nie ma czego szukać w wynikach wyszukiwania, a wpuszczony
  // do indeksu konkurowałby ze stroną główną o to samo zapytanie o markę.
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  return <LoginView locale="pl" searchParams={await searchParams} />;
}
