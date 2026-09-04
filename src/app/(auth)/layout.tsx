import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ROUTES } from "@/lib/auth/routes";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href={ROUTES.home} className="rounded-btn" aria-label="RentixON, strona główna">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
