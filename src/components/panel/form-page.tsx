import { Stepper } from "@/components/panel/form-section";
import { PageHeader } from "@/components/panel/page-header";

/**
 * Strona z formularzem: nagłówek z powrotem, kolumna formularza 720 px
 * i — przy kreatorze — kroki po prawej (redesign/05-*.svg, 12-*.svg).
 */
export function FormPage({
  back,
  title,
  steps,
  aside,
  children,
}: {
  back: { href: string; label: string };
  title: string;
  steps?: { label: string; items: readonly string[]; active: number };
  /** Treść prawej kolumny zamiast kroków, np. podsumowanie umowy. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const side = aside ?? (steps ? <Stepper label={steps.label} steps={steps.items} active={steps.active} /> : null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader back={back} title={title} />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)] lg:gap-16">
        <div className="order-2 min-w-0 lg:order-1">{children}</div>
        {side ? <aside className="order-1 lg:sticky lg:top-10 lg:order-2">{side}</aside> : null}
      </div>
    </div>
  );
}
