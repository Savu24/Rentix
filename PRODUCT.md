# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dwie grupy, jeden panel:

- **Zarządca najmu / mała firma zarządzająca (priorytet).** Robi to zawodowo,
  obsługuje kilkanaście–kilkadziesiąt lokali, pracuje z desktopa, wraca do panelu
  codziennie. Dla niego liczy się gęstość informacji, skanowalność list i to, żeby
  powtarzalna czynność (naliczenie, odnotowanie wpłaty, wysyłka rachunku) miała
  jak najkrótszą ścieżkę.
- **Prywatny właściciel, 1–20 lokali.** Wynajmuje obok etatu, wchodzi raz–dwa razy
  w miesiącu, często z telefonu. Dla niego liczy się to, żeby po miesiącu przerwy
  od razu wiedzieć, co wymaga uwagi, bez uczenia się interfejsu od nowa.

Najemca jest użytkownikiem drugorzędnym — ma własny, wąski widok (`/najemca`)
i dostaje maile z rachunkami, ale nie zarządza niczym.

## Product Purpose

Zastąpić arkusz kalkulacyjny w zarządzaniu najmem na polskim rynku: umowy,
naliczanie czynszu, rachunki, wpłaty, koszty i roczne zestawienie w jednym
miejscu. Sukces to miesiąc, w którym właściciel nie otworzył Excela ani razu,
a rozliczenie roczne dla księgowego wyszło z eksportu, nie z ręcznego sumowania.

## Positioning

Naliczanie czynszu i rachunki dzieją się same, a cennik nie rośnie z liczbą
mieszkań — stała cena bez limitu lokali. Konkurencja z tego segmentu (SON)
skaluje cenę z portfelem i trzyma rozliczenie roczne w wyższym planie.

## Operating Context

- Codzienny przebieg `POST /api/cron/billing` wystawia rozliczenia i wysyła
  przypomnienia; panel jest miejscem, gdzie użytkownik ogląda skutek, a nie
  uruchamia proces.
- Dokumenty wychodzą jako PDF (`@react-pdf/renderer`) z polskimi znakami
  i kwotą słownie — umowa najmu i rachunek trafiają do najemcy mailem (Resend).
- Rok podatkowy: zestawienie kasowe i eksport CSV dla księgowego.
- Zgłoszenia usterek przychodzą telefonem, nie przez aplikację.

## Capabilities and Constraints

- Next.js 15 App Router + React 19 + TypeScript, Tailwind CSS v4, komponenty
  w stylu shadcn/ui. Prisma 7 + PostgreSQL, Auth.js (Credentials + JWT).
- Wszystkie kwoty to **liczby całkowite groszy**; zaokrąglanie wyłącznie
  w `src/lib/money.ts`. UI nigdy nie liczy pieniędzy sam.
- Status rachunku („zaległy", „nadchodzący") jest **wyliczany z bieżącej daty**,
  nie zapisany — UI musi go renderować z `resolveInvoiceStatus()`.
- Tokeny kolorów, promieni i cieni żyją raz, w `src/app/globals.css`, i wychodzą
  jako tokeny Tailwinda przez `@theme inline`. **Zakaz hexów w komponentach.**
- Motyw jasny i ciemny przełącza atrybut `data-theme` na `<html>`; skrypt
  w `<head>` ustawia go przed pierwszym malowaniem. Każdy element musi działać
  w obu motywach.
- API-first: logika nie mieszka w komponentach, bo te same endpointy ma
  w przyszłości konsumować aplikacja React Native.
- Terminologia produktu jest polska i konkretna: nieruchomość, jednostka, pokój,
  umowa, najemca, właściciel, rachunek, wpłata, koszt, naliczenie.
- Moduł zgłoszeń usterek jest świadomie poza zakresem.

## Brand Commitments

- Nazwa **Rentix**. Znak marki to litera **R** w bursztynowym kwadracie
  (`public/logo-mark.png`, wchodzi maską CSS, żeby brać kolor z tokenu) — ten sam
  rysunek co ikona na ekranie głównym telefonu.
- Paleta marki: butelkowa zieleń (`--accent`), terakota jako drugi akcent
  (`--accent2`), bursztyn jako wyróżnienie (`--highlight`), kremowe tło.
  Użytkownik potwierdził, że tożsamość zostaje — redesign podnosi wykonanie,
  nie wymienia świata wizualnego.
- Kroje: Bricolage Grotesque (display), Inter (tekst), Roboto Mono (liczby).
- Głos: rzeczowy i po ludzku, bez korporacyjnego żargonu. Materiały marketingowe
  mówią wprost, czego produkt nie robi.

## Evidence on Hand

- Realne: zrzut palety i tokenów w `src/app/globals.css`, paleta wykresów
  przewalidowana pod kątem CVD w `docs/chart-palette.md`, dane demo
  (`npm run db:seed`), znak marki w `public/`.
- **Brak opinii klientów, logotypów klientów, liczb wdrożeń i benchmarków.**
  Landing dziś mówi wprost, że liczby na podglądzie panelu są przykładowe.
  Przyszła praca nie może tego wymyślać.
- Cennik podany na stronie (Free do 20 najemców, Pro 149 zł/mies.) jest
  deklaracją produktową, nie zaimplementowanym billingiem.

## Product Principles

1. **Prawda o pieniądzach ma pierwszeństwo przed estetyką.** Kwoty w tabularnych
   cyfrach, statusy zawsze z etykietą tekstową obok koloru, żadnych liczb, których
   nie da się wywieść z bazy.
2. **Panel jest narzędziem pracy, nie prezentacją.** Gęstość i skanowalność listy
   wygrywają z ekspresją; marka żyje w detalu, nie w dekoracji.
3. **Nie obiecujemy tego, czego nie robimy.** Brak wymyślonych referencji, brak
   zapowiadania modułów poza zakresem.
4. **Jeden powrót w miesiącu musi wystarczyć.** Po przerwie użytkownik od razu
   widzi, co wymaga reakcji — zaległości i nadchodzące terminy przed resztą.
5. **Polski rynek jako domyślna rzeczywistość.** Terminologia, format kwot, VAT
   liczony z pozycji, rok podatkowy kasowo.

## Accessibility & Inclusion

- Kolor nigdy nie jest jedynym nośnikiem znaczenia — statusy `--good`/`--warn`/
  `--bad` leżą blisko siebie dla deuteranopii, więc każdy status niesie etykietę.
- Paleta wykresów przeszła walidator CVD (`docs/chart-palette.md`): druga seria
  jest niebieska, nie w kolorze marki, bo protanopia zlepia łuk czerwień–zieleń.
- Fokus klawiaturowy ma własny pierścień w kolorze akcentu, nigdy domyślnego
  niebieskiego przeglądarki.
- `prefers-reduced-motion` wygasza animacje globalnie — każdy nowy ruch musi to
  respektować.
- Obowiązują oba motywy, jasny i ciemny, w tym samym stopniu.
