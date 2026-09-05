import type { Metadata } from "next";

import { RegisterView } from "@/components/auth/register-view";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary("pl").auth.register;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return <RegisterView locale="pl" />;
}
