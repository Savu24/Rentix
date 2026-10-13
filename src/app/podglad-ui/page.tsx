import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Clock,
  Download,
  DoorOpen,
  Hammer,
  Key,
  Lock,
  Pencil,
  Plus,
  Repeat,
  Search,
  Send,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DateInput } from "@/components/ui/date-input";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormSkeleton, PropertyCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";

/*
  Podgląd komponentów bazowych do porównania z redesign/01-design-system.svg.
  Tylko w trybie deweloperskim: w produkcji ta trasa zwraca 404, więc nie
  trafia do użytkowników i nie potrzebuje tłumaczeń.
*/
export const metadata: Metadata = { title: "Podgląd komponentów", robots: { index: false } };

const SWATCHES: { group: string; tokens: string[] }[] = [
  { group: "Powierzchnie", tokens: ["bg", "surface", "sunken", "hover", "line", "line-2"] },
  { group: "Tekst", tokens: ["ink", "ink-2", "ink-3"] },
  { group: "Marka", tokens: ["primary", "primary-hover", "primary-soft", "amber", "amber-soft", "side", "side-active"] },
  { group: "Zysk / opłacone", tokens: ["good", "good-soft", "good-ink"] },
  { group: "Ostrzeżenie", tokens: ["warn", "warn-soft", "warn-ink"] },
  { group: "Strata / zaległe", tokens: ["bad", "bad-soft", "bad-ink"] },
  { group: "Nadchodzące", tokens: ["info", "info-soft", "info-ink"] },
  { group: "Wykresy", tokens: ["chart-1", "chart-2", "chart-grid"] },
];

type Status = [label: string, tone: BadgeProps["tone"], icon: BadgeProps["icon"]];

const STATUSES: { group: string; items: Status[] }[] = [
  {
    group: "Dokumenty",
    items: [
      ["Opłacona", "good", CheckCircle2],
      ["Częściowo", "warning", Clock],
      ["Termin za 3 dni", "warning", Clock],
      ["Zaległa", "critical", AlertCircle],
      ["Nadchodząca", "info", CalendarDays],
      ["Szkic", "neutral", Pencil],
      ["Anulowana", "neutral", CircleSlash],
    ],
  },
  {
    group: "Umowy",
    items: [
      ["Aktywna", "good", CheckCircle2],
      ["Rezerwacja", "info", CalendarDays],
      ["Wypowiedziana", "neutral", CircleSlash],
      ["Wygasła", "neutral", Clock],
    ],
  },
  {
    group: "Lokale",
    items: [
      ["Wynajęta", "good", CheckCircle2],
      ["Wolna", "info", DoorOpen],
      ["W remoncie", "warning", Hammer],
    ],
  },
  {
    group: "Inne",
    items: [
      ["Wygasa za 19 dni", "warning", Clock],
      ["10 dni po terminie", "critical", AlertCircle],
      ["Podnajem", "accent", Key],
      ["Plan Pro", "amber", Lock],
      ["Cykliczny", "outline", Repeat],
    ],
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="r-display border-b border-border pb-3 text-[22px] text-fg">{title}</h2>
      {children}
    </section>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] font-[550] text-subtle">{children}</p>;
}

export default function ComponentPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-14 px-4 py-10 lg:px-10">
      <header className="flex items-start justify-between gap-4">
        <h1 className="r-display text-[30px] leading-9 text-fg">Podgląd komponentów</h1>
        <ThemeToggle />
      </header>

      <Section title="Kolor">
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
          {SWATCHES.map(({ group, tokens }) => (
            <div key={group} className="flex flex-col gap-2">
              <Caption>{group}</Caption>
              <div className="flex flex-wrap gap-3">
                {tokens.map((token) => (
                  <div key={token} className="flex w-[84px] flex-col gap-1">
                    <span
                      className="h-9 rounded-control border border-border"
                      style={{ background: `var(--${token})` }}
                    />
                    <span className="text-[10.5px] text-muted">{token}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typografia">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <p className="r-display text-[30px] leading-9 text-fg">Nieruchomości</p>
            <p className="r-display text-xl text-fg">Zakończenie umowy</p>
            <p className="font-mono text-[46px] leading-[48px] font-[650] tracking-[-1.2px] text-good">
              {formatMoney(255783)}
            </p>
            <p className="font-mono text-4xl font-[650] tracking-[-0.8px] text-fg">86%</p>
            <p className="text-[15px] leading-6 font-semibold text-fg">Rozliczenia</p>
            <p className="text-sm text-fg">Krowoderska 37/12, 31-142 Kraków</p>
            <p className="font-mono text-sm font-semibold text-fg">{formatMoney(165000)}</p>
            <p className="text-[13px] text-muted">termin 2 paź</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-end gap-2">
              <Caption>Cyfry tabelaryczne</Caption>
              {[111111, 255783, 1048000, -20500].map((value) => (
                <span
                  key={value}
                  className={`font-mono text-base font-semibold ${value < 0 ? "text-bad" : "text-fg"}`}
                >
                  {formatMoney(value)}
                </span>
              ))}
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Przyciski">
        <div className="flex flex-col gap-4">
          {(
            [
              ["primary", "Dodaj najemcę", Plus],
              ["secondary", "Pobierz PDF", Download],
              ["ghost", "Anuluj", null],
              ["danger", "Usuń trwale", Trash2],
              ["soft", "Wyślij najemcy", Send],
              ["danger-soft", "Anuluj dokument", null],
            ] as const
          ).map(([variant, label, Icon]) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="w-28 text-sm font-semibold text-fg">{variant}</span>
              <Button variant={variant}>
                {Icon ? <Icon className="size-[18px]" aria-hidden /> : null}
                {label}
              </Button>
              <Button variant={variant} disabled>
                {Icon ? <Icon className="size-[18px]" aria-hidden /> : null}
                {label}
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-28 text-sm font-semibold text-fg">rozmiary</span>
            <Button size="sm">Mały 32</Button>
            <Button>Średni 40</Button>
            <Button size="lg">Duży 48</Button>
            <Button variant="secondary" size="icon" aria-label="Edytuj">
              <Pencil className="size-[18px]" aria-hidden />
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Pola formularza">
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="p-name" label="Nazwa">
            <Input {...fieldAria("p-name", {})} placeholder="np. Krowoderska 37/12" />
          </FormField>
          <FormField id="p-filled" label="Wypełnione">
            <Input {...fieldAria("p-filled", {})} defaultValue="Krowoderska 37/12" />
          </FormField>
          <FormField id="p-error" label="Kod pocztowy" error="Kod pocztowy w formacie 00-000">
            <Input
              {...fieldAria("p-error", { error: "Kod pocztowy w formacie 00-000" })}
              defaultValue="31142"
            />
          </FormField>
          <FormField id="p-disabled" label="Wyłączone">
            <Input {...fieldAria("p-disabled", {})} defaultValue="R 3/10/2026" disabled />
          </FormField>
          <FormField id="p-type" label="Typ">
            <Select {...fieldAria("p-type", {})} defaultValue="flat">
              <option value="flat">Mieszkanie</option>
              <option value="house">Dom</option>
            </Select>
          </FormField>
          <FormField id="p-date" label="Data rozpoczęcia">
            <DateInput {...fieldAria("p-date", {})} value="2026-11-01" />
          </FormField>
          <FormField id="p-search" label="Szukaj">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-subtle"
                aria-hidden
              />
              <Input {...fieldAria("p-search", {})} className="pl-10" placeholder="Szukaj najemcy" />
            </div>
          </FormField>
          <FormField id="p-notes" label="Ustalenia dodatkowe" className="sm:col-span-2 lg:col-span-1">
            <Textarea
              {...fieldAria("p-notes", {})}
              defaultValue={"Zwierzęta po uzgodnieniu.\nZakaz palenia w lokalu."}
            />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-8">
          <CheckboxField label="Zaznaczone" defaultChecked />
          <CheckboxField label="Puste" />
          <CheckboxField label="Niedostępne" disabled />
          <CheckboxField label="Zaznaczone, niedostępne" defaultChecked disabled />
        </div>
      </Section>

      <Section title="Statusy">
        <div className="flex flex-col gap-4">
          {STATUSES.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <span className="w-28 shrink-0 text-sm font-semibold text-fg">{group}</span>
              <div className="flex flex-wrap gap-3">
                {items.map(([label, tone, icon]) => (
                  <Badge key={label} tone={tone} icon={icon}>
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <span className="w-28 shrink-0 text-sm font-semibold text-fg">Mała</span>
            <div className="flex flex-wrap gap-3">
              <Badge size="sm" tone="good" icon={CheckCircle2}>
                Opłacona
              </Badge>
              <Badge size="sm">12</Badge>
              <Badge size="sm" tone="accent">
                12
              </Badge>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Karty i dane">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { label: "Na plusie", tone: "good" as const, icon: TrendingUp, total: 255783, income: 435000, costs: 179217 },
            { label: "Na minusie", tone: "critical" as const, icon: TrendingDown, total: -112040, income: 0, costs: 112040 },
          ].map((tile) => (
            <Card key={tile.label} className="lg:rounded-tile">
              <CardContent className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-[550] text-muted">Bilans miesięczny</span>
                  <Badge tone={tile.tone} icon={tile.icon}>
                    {tile.label}
                  </Badge>
                </div>
                <p
                  className={`font-mono text-[40px] leading-none font-[650] tracking-[-1px] whitespace-nowrap ${tile.total < 0 ? "text-bad" : "text-good"}`}
                >
                  {tile.total > 0 ? "+" : ""}
                  {formatMoney(tile.total)}
                </p>
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted">Przychód</span>
                    <span className="font-mono text-[15px] font-semibold text-fg">
                      {formatMoney(tile.income)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted">Koszty</span>
                    <span className="font-mono text-[15px] font-semibold text-fg">
                      {formatMoney(tile.costs)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Rozliczenia</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg">R 3/10/2026</span>
                <Badge tone="critical" icon={AlertCircle}>
                  Zaległa
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg">R 8/10/2026</span>
                <Badge tone="good" icon={CheckCircle2}>
                  Opłacona
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Komunikaty i stany">
        <div className="grid gap-3 lg:grid-cols-2">
          <Alert tone="warning" action={<a href="#">Uzupełnij</a>}>
            Dokumenty wychodzą bez adresu wystawcy
          </Alert>
          <Alert tone="info" action={<a href="#">Pokaż</a>}>
            2 szkice czekają na zatwierdzenie
          </Alert>
          <Alert tone="error" action={<a href="#">Ponów</a>}>
            Nie udało się wysłać dokumentu
          </Alert>
          <Alert tone="success">Wysłano na zofia.w@poczta.pl</Alert>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <EmptyState
            icon={Users}
            title="Dodaj pierwszego najemcę"
            action={
              <Button>
                <UserPlus className="size-[18px]" aria-hidden />
                Dodaj najemcę
              </Button>
            }
          />
          <div className="flex flex-col gap-4 rounded-tile border border-border bg-surface p-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-[10px]" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-2.5 w-2/5" />
                </div>
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <PropertyCardSkeleton />
          <FormSkeleton rows={1} />
        </div>
      </Section>
    </main>
  );
}
