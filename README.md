# Rentix

SaaS do zarządzania najmem nieruchomości dla polskiego rynku — umowy, rozliczenia,
płatności, zgłoszenia usterek i raporty finansowe.

**Stan: etapy 1–8 ukończone** — setup, design system, auth, model danych,
nieruchomości i jednostki, najemcy i umowy z generowaniem PDF, finanse
(naliczanie czynszu, dokumenty rozliczeniowe, wpłaty, przypomnienia mailowe),
ustawienia konta i danych wystawcy, koszty i raporty z zestawieniem rocznym.
Wszystkie pozycje nawigacji prowadzą do zbudowanych stron.

**Zgłoszenia usterek są świadomie poza zakresem.** Najemcy zgłaszają awarie
telefonem, więc moduł dublowałby kanał, z którego i tak nikt by nie korzystał.
Tabele `maintenance_requests` i `maintenance_photos` zostają w schemacie — nie
kosztują nic, a odwrócenie tej decyzji nie wymagałoby wtedy migracji.

## Stack

| Warstwa      | Technologia                                          |
| ------------ | ---------------------------------------------------- |
| Framework    | Next.js 15 (App Router) + React 19 + TypeScript       |
| Baza         | PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Auth         | Auth.js (NextAuth v5) — Credentials + Google OAuth, JWT, bcrypt |
| UI           | Tailwind CSS v4 + komponenty w stylu shadcn/ui        |
| Walidacja    | Zod 4 (ten sam schemat na kliencie i w API)           |
| Formularze   | React Hook Form                                       |
| Wykresy      | Recharts                                              |
| E-mail       | Resend                                                |
| Testy        | Vitest + Testing Library                              |

## Uruchomienie

```bash
npm install
cp .env.example .env      # uzupełnij DATABASE_URL i AUTH_SECRET
npm run db:migrate        # tworzy tabele
npm run dev               # http://localhost:3000
```

`AUTH_SECRET` wygenerujesz komendą `npx auth secret`.

### Baza danych

Projekt oczekuje zwykłego connection stringa PostgreSQL (`postgresql://...`) —
identycznego lokalnie i na produkcji. Darmowy hosting: [Neon](https://neon.tech)
lub [Supabase](https://supabase.com).

**Supabase — wymagany parametr `uselibpqcompat=true`:**

```
postgresql://…@…pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require
```

Sterownik `pg` traktuje samo `sslmode=require` jak `verify-full`, a Supabase
podpisuje certyfikat własnym CA — bez tego parametru połączenie pada na
`self-signed certificate in certificate chain` (Prisma `P1011`). Z nim obowiązuje
semantyka libpq: ruch nadal idzie przez TLS, ale bez weryfikacji łańcucha.
Docelowo warto pobrać certyfikat CA z Supabase i wrócić do `verify-full`.

Przy wdrożeniu na Vercel (serverless) użyj dla `DATABASE_URL` transaction poolera
(port 6543), a session poolera (5432) zostaw do migracji. Na Render session pooler
wystarczy do obu.

> **Uwaga po zmianie `DATABASE_URL`:** klient Prismy jest cache'owany na
> `globalThis`, żeby hot reload nie otwierał nowych pul połączeń. Hot reload nie
> podmieni połączenia — po edycji `.env` zrestartuj `npm run dev`.

> **Uwaga (Node 20):** `npm run db:dev` (lokalny Prisma Postgres) wymaga Node 22+,
> bo korzysta z modułu `node:sqlite`. Na Node 20 użyj bazy hostowanej albo
> lokalnej instalacji PostgreSQL.

## Skrypty

| Komenda              | Opis                                            |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | serwer deweloperski                              |
| `npm run build`      | `prisma generate` + `migrate deploy` + build produkcyjny |
| `npm test`           | testy jednostkowe                                |
| `npm run typecheck`  | `tsc --noEmit`                                   |
| `npm run db:migrate` | migracja deweloperska                            |
| `npm run db:deploy`  | migracje na produkcji (bez resetu bazy)          |
| `npm run db:seed`    | dane demo (idempotentne — można puszczać wielokrotnie) |
| `npm run db:studio`  | przeglądarka danych Prisma Studio                |

## Architektura

### API-first

Logika biznesowa nie mieszka w komponentach. API routes (`src/app/api/**`) są
czystymi endpointami REST zwracającymi JSON — te same, które w przyszłości
skonsumuje aplikacja mobilna w React Native, bez przepisywania backendu.

- Sukces zwraca zasób wprost; błąd zawsze kopertę
  `{ error: { code, message, fields? } }` (`src/lib/api/response.ts`).
- Kod błędu jest maszynowy (`VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`…),
  więc klient nie parsuje komunikatów po tekście.
- Middleware celowo **nie** obejmuje `/api/*` — endpointy odpowiadają `401 JSON`,
  a nie przekierowaniem na stronę logowania.

### Bezpieczeństwo

- Hasła: bcrypt, koszt 12. Przy nieistniejącym koncie liczony jest hash-pułapka,
  żeby czas odpowiedzi nie zdradzał, czy dany e-mail ma konto.
- Walidacja Zod na **każdym** API route — ta sama, której używa formularz.
- Rate limiting: 5 prób logowania / 15 min na konto, 5 rejestracji / h na IP,
  5 prób zmiany hasła / 15 min. Licznik trzyma Redis (Upstash), gdy ustawione są
  `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`; bez nich spada do
  pamięci procesu — wygodne lokalnie, **bezużyteczne na serverless**, bo każda
  instancja startuje z wyzerowanym licznikiem. Awaria Redisa przepuszcza
  żądanie i loguje błąd: limiter jest zabezpieczeniem, a nie warunkiem
  działania logowania.
- CSRF: wbudowany w NextAuth (POST-y wymagają tokenu), wylogowanie idzie przez
  Server Action, więc Next dokłada własny token akcji.
- Autoryzacja jest egzekwowana w API routes i Server Componentach
  (`src/lib/auth/session.ts`), nie w UI. Middleware odpowiada wyłącznie za
  nawigację, nie za dostęp do danych.
- Ochrona przed open redirect: `?powrot=` przyjmuje tylko ścieżki względne.
- Logowanie Google jest opcjonalne (`AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`);
  bez kompletu przycisk się nie pokazuje. Konto Google łączy się z istniejącym
  kontem o tym samym adresie (`allowDangerousEmailAccountLinking`) — Google
  weryfikuje adres, ale dopóki rejestracja hasłem nie potwierdza go mailem,
  zostaje wąska furtka dla konta założonego na cudzy Gmail.

### Separacja danych

Każde zapytanie do bazy zawęża się do `organizationId` wziętego **z sesji**,
nigdy z parametru w URL-u. `organizationId` i `role` siedzą w tokenie JWT, więc
sprawdzenie nie kosztuje dodatkowego zapytania.

### Design system

Źródło prawdy: `Rentix Design System.dc.html` w Claude Design. Wszystkie kolory,
promienie i cienie są zadeklarowane raz jako CSS custom properties
w `src/app/globals.css` i wystawione jako tokeny Tailwinda (`@theme inline`).

Motyw przełącza atrybut `data-theme` na `<html>`; wybór trafia do localStorage
**i** do ciasteczka, żeby serwer renderował od razu poprawny wariant. Skrypt
w `<head>` ustawia motyw przed pierwszym malowaniem — brak białego mignięcia.

Nazwy tokenów są 1:1 z design systemem, z dwoma wyjątkami dla czytelności:
`--text` → `text-fg`, `--text-secondary` → `text-muted`.

**Nie wpisuj hexów w komponentach.** Kolor zmienia się w `globals.css`.

### Pieniądze

**Wszystkie kwoty to liczby całkowite groszy**, nigdy Float — pola mają sufiks
`Grosze`, żeby nie dało się pomylić jednostki. Arytmetyka zmiennoprzecinkowa
gubi grosze przy sumowaniu (`0.1 + 0.2 !== 0.3`), a po tysiącu faktur saldo
rozjeżdża się o kwoty, których nikt potem nie znajdzie.

Zaokrąglać wolno **wyłącznie** w `src/lib/money.ts`. VAT sumuje się z pozycji,
nie liczy od sumy netto — przy mieszanych stawkach (czynsz zw. + prąd 23%)
liczenie od sumy dałoby wynik bez sensu, a nawet przy jednej stawce obie metody
potrafią różnić się o grosz.

### Status faktury jest wyliczany, nie zapisany

W bazie siedzi tylko stan rozliczenia (`DRAFT`/`ISSUED`/`PARTIALLY_PAID`/`PAID`/
`CANCELLED`). „Zaległa" i „nadchodząca" to funkcje bieżącej daty, liczone
w `src/lib/invoices/status.ts` — kolumna wymagałaby crona przestawiającego
rekordy każdej nocy i między jego przebiegami i tak byłaby nieaktualna.
Indeks `(organizationId, status, dueDate)` sprawia, że filtr jest tani.

Definicja „zaległej" istnieje w jednym miejscu w dwóch postaciach:
`resolveInvoiceStatus()` dla UI i `overdueWhere()` dla zapytań Prismy — obie
w tym samym pliku, żeby nie rozjechały się przy zmianie reguły.

### Dane wystawcy

Rejestracja tworzy organizację z samą nazwą — konto musi powstać w jednym kroku,
więc adres i NIP zostają puste. Uzupełnia się je w `/panel/ustawienia` i to
stamtąd trafiają na rachunek jako sprzedawca oraz na umowę jako wynajmujący.

Walidacja ich **nie wymusza** — inaczej nie dałoby się zapisać częściowo
wypełnionego formularza. Zamiast tego `isSellerComplete()`
(`src/lib/organizations/seller.ts`) sprawdza komplet i panel przypomina
o brakach: w ustawieniach oraz na karcie dokumentu, czyli w momencie, w którym
za chwilę pobierzesz PDF i wyślesz go najemcy.

NIP jest poza tym warunkiem: osoba fizyczna wynajmująca prywatnie go nie ma,
a wymaganie go dałoby ostrzeżenie, którego nie da się wyłączyć.

`slug` nie zmienia się razem z nazwą — siedzi w publicznych adresach ofert
(`/o/<slug>`), więc przestawianie go przy każdej korekcie nazwy zrywałoby linki.

### Naliczanie czynszu

Dokumenty czynszowe powstają **automatycznie**, a nie z formularza. Raz na dobę
`POST /api/cron/billing` przechodzi po wszystkich organizacjach i dla każdej
aktywnej umowy, której dzień naliczania już minął, wystawia rozliczenie za
bieżący miesiąc. Zewnętrzny scheduler (Render Cron Job w `render.yaml`, Vercel
Cron) uwierzytelnia się nagłówkiem `Authorization: Bearer $CRON_SECRET`.

Codziennie, a nie raz w miesiącu, bo umowy mają różne dni naliczania — a przy
okazji tym samym przebiegiem wychodzą przypomnienia o terminach.

**Przebieg jest idempotentny.** Umowa, która ma już dokument z tym samym
`periodStart`, jest pomijana. Cron potrafi wystrzelić dwa razy, a najemca nie
może dostać dwóch rachunków za sierpień. Rozpoznajemy okres po `periodStart`,
nie po miesiącu wystawienia: umowa zaczynająca się 15 sierpnia ma okres od 15.,
i to on jednoznacznie identyfikuje rozliczenie.

Ten sam kod odpala przycisk „Nalicz czynsz" w panelu — do uzupełnienia zaległego
miesiąca albo naliczenia przed terminem. Różnica jest jedna: wywołanie ręczne
nie sprawdza, czy dzień naliczania już minął, bo użytkownik prosi o konkretny
miesiąc świadomie.

Czynsz za niepełny miesiąc jest dzielony proporcjonalnie do liczby dni *danego*
miesiąca (`src/lib/leases/billing.ts`) — najemca wprowadzający się 15 lutego
płaci inaczej niż 15 marca, choć w obu przypadkach mieszka „od połowy miesiąca".

### Numeracja dokumentów

Format `FV 3/08/2026`: kolejny numer w miesiącu, miesiąc, rok — zapis, którego
oczekuje polskie biuro rachunkowe. Numeracja resetuje się co miesiąc i biegnie
osobno dla każdego rodzaju dokumentu (`R` rachunek, `FV` faktura VAT,
`PF` proforma), bo to odrębne rejestry.

Rodzaj dokumentu wynika ze stawek na pozycjach, a nie z ustawienia: same stawki
bez podatku dają rachunek, pierwsza pozycja z VAT-em wymusza fakturę.

Anulowany dokument zostaje w bazie ze statusem `CANCELLED` i **zachowuje numer** —
dziura w rejestrze wygląda dla księgowego jak zaginiony dokument. Z tego samego
powodu nie ma szkiców: numer jest wymagany i unikalny, więc szkic musiałby zająć
numer, którego może nigdy nie użyć.

### Wpłaty

`paidGrosze` na fakturze jest **przeliczane z sumy rekordów** `Payment`, a nie
zwiększane o kwotę wpłaty. Licznik rozjechałby się z tabelą po pierwszym
usunięciu błędnego wpisu i nikt by tego nie zauważył. Zapis wpłaty i przeliczenie
statusu idą w jednej transakcji, więc nie ma stanu, w którym pieniądze są
w bazie, a faktura nadal straszy zaległością.

Nadpłata liczy się jako „opłacona" — zwrot to osobny temat, a nie powód, żeby
dokument wisiał na liście zaległości.

### Przypomnienia mailowe

Trzy powiadomienia (`INVOICE_ISSUED`, `PAYMENT_REMINDER`, `PAYMENT_OVERDUE`)
konkurują ze sobą: najemca dostaje jedną wiadomość, nie trzy. Pierwszeństwo ma
najpilniejsza. Reguła wyboru siedzi w `src/lib/notifications/schedule.ts` jako
czysta funkcja — bez bazy i bramki e-mail, żeby dało się ją sprawdzić testem.

Wezwanie do zapłaty ponawiamy co 7 dni. Codzienna wiadomość o tej samej
zaległości trafia do spamu i przestaje działać.

**Jeden nadawca, wiele tożsamości.** Wiadomości wychodzą z jednego adresu —
`EMAIL_FROM`, należącego do platformy — bo tylko jej domena ma rekordy SPF
i DKIM. Nazwa wyświetlana bierze się z nazwy organizacji, a adres kontaktowy
wynajmującego (ustawienia konta) trafia do `Reply-To`. Najemca widzi w skrzynce
swojego wynajmującego i odpisuje prosto do niego, z pominięciem platformy.

Alternatywą byłoby trzymanie haseł do skrzynek wszystkich klientów — koszt
nieproporcjonalny do zysku. Ten sam podział stosuje każdy SaaS wysyłający pocztę
w cudzym imieniu.

**Dwie drogi wysyłki.** `RESEND_API_KEY` włącza Resend (wymaga zweryfikowanej
domeny nadawcy, najlepsza dostarczalność). Komplet `SMTP_HOST` / `SMTP_USER` /
`SMTP_PASSWORD` włącza zwykły SMTP — wtedy wysyłasz z istniejącej skrzynki
(Gmail, poczta hostingu, Brevo) i nie musisz konfigurować rekordów DNS, bo
adres, którego używasz, ma je już ustawione. Gdy skonfigurowane są obie,
wygrywa Resend. `EMAIL_FROM` musi wskazywać adres, z którego wolno ci wysyłać —
przy Gmailu ten sam, co `SMTP_USER`.

Dokument jedzie do najemcy **jako PDF w załączniku**, nie linkiem: najemca nie
ma konta w panelu, więc odnośnik prowadziłby go na ekran logowania.

Wynik każdej wysyłki — także nieudanej — ląduje w tabeli `notifications`.
Ponowny przebieg nie zdubluje wiadomości, która poszła, ale spróbuje jeszcze raz
tej, która padła na błędzie bramki. Bez `RESEND_API_KEY` wysyłka kończy się
statusem `FAILED` z czytelnym powodem, zamiast po cichu udawać sukces.

### Koszty i raporty

Do etapu 8 system znał wyłącznie wpływy, więc raport potrafiłby pokazać przychód,
ale nigdy zysku — jedynym polem kosztowym w schemacie było `costGrosze` przy
zgłoszeniach usterek, których nie budujemy. Stąd tabela `expenses`: wydatek ma
kategorię z zamkniętej listy (wolny tekst rozjechałby się na „wspólnota",
„czynsz do wspólnoty" i „opłata administracyjna" oznaczające to samo), kwotę,
datę poniesienia i opcjonalne przypisanie do nieruchomości.

**Wszystko liczymy kasowo** — po dniu, w którym pieniądze faktycznie wpłynęły
(`Payment.paidAt`) albo wyszły (`Expense.paidAt`), nigdy po dacie wystawienia
dokumentu. Najem prywatny rozlicza się ryczałtem od przychodu *otrzymanego*,
więc zestawienie liczone po dacie faktury nie zgadzałoby się z zeznaniem.

Koszt bez przypisanej nieruchomości (księgowość, obsługa prawna) trafia
w raporcie do osobnego wiersza „Koszty ogólne", zamiast być rozdzielany
proporcjonalnie. Każdy klucz podziału byłby zmyślony, a zmyślona liczba
w raporcie jest gorsza niż jawna dziura.

Średnie opóźnienie płatności liczymy **tylko z faktur zapłaconych po terminie**.
Wciągnięcie tych zapłaconych wcześniej, z ujemnym opóźnieniem, wyzerowałoby
wynik i pokazało „0 dni" właścicielowi, któremu połowa najemców płaci dwa
tygodnie po czasie.

Eksport idzie CSV-em ze średnikiem i BOM-em: polski Excel czyta przecinek jako
część liczby, a UTF-8 bez BOM-u otwiera jako windows-1250.

Kolory wykresów to tokeny `--chart-1` i `--chart-2` z `docs/chart-palette.md`,
więc wykres przełącza się razem z motywem. Drugą serią jest niebieski, a nie
terakota z palety marki — zieleń i terakota leżą w tym samym łuku
czerwień–zieleń, który protanopia zlepia.

### Generowanie PDF umowy

`GET /api/leases/:id/pdf` renderuje umowę przez `@react-pdf/renderer`.

**Font jest osadzany z pliku TTF** (`@expo-google-fonts/inter`, ten sam krój co
w interfejsie). Wbudowane fonty PDF używają kodowania WinAnsi, w którym nie ma
ą, ć, ę, ł, ń, ś, ź ani ż — polski tekst wychodziłby dziurawy. Pliki TTF są
wskazane wprost w `outputFileTracingIncludes`, bo analiza importów nie wykryje
odczytu z dysku w czasie żądania.

Kwoty na umowie idą też słownie (`src/lib/money-words.ts`) — z pełną polską
odmianą („dwa tysiące", „pięć tysięcy", „dwanaście tysięcy").

PDF powstaje na żądanie, a nie przy zapisie umowy: dane mogą się jeszcze
zmieniać, a plik w magazynie natychmiast rozjechałby się z bazą.

### Gotowość na KSeF

`Invoice` trzyma dane w rozbiciu wymaganym przez strukturę FA(2): numer, data
wystawienia, data sprzedaży (osobno od wystawienia), pozycje ze stawką w rozbiciu
netto/VAT/brutto oraz **migawkę danych nabywcy** — kopiowaną w chwili
wystawienia, nie czytaną przez relację, bo faktura musi pokazywać dane z dnia
wystawienia nawet po zmianie profilu najemcy. Pola `ksef*` są przygotowane;
integracji nie ma.

Domyślną stawką jest `ZW` — najem lokali mieszkalnych na cele mieszkaniowe jest
zwolniony z VAT (art. 43 ust. 1 pkt 36 ustawy o VAT).

## Wdrożenie

### Vercel (zalecane)

1. **Baza.** `DATABASE_URL` musi wskazywać **transaction pooler** (Supabase, port
   6543) — session pooler wyczerpie limit połączeń, bo każda funkcja łączy się
   osobno. `DIRECT_URL` wskazuje session pooler (5432) i służy wyłącznie
   migracjom, których pooler transakcyjny nie obsługuje.
2. **Limiter.** Załóż darmowy Redis na Upstash i ustaw `UPSTASH_REDIS_REST_URL`
   oraz `UPSTASH_REDIS_REST_TOKEN`. Bez nich licznik prób logowania siedzi
   w pamięci instancji, więc na serverless praktycznie nie działa.
3. **Harmonogram.** Cron NIE jest w `vercel.json` — woła go GitHub Actions
   (`.github/workflows/billing.yml`). W ustawieniach repozytorium dodaj sekrety
   `APP_URL` i `CRON_SECRET` (ten sam, co w zmiennych Vercela). Darmowy plan
   Vercela daje jedno uruchomienie dziennie o nieokreślonej godzinie, a przy
   harmonogramie poza hostingiem zmiana hostingu nic nie łamie.
4. **Migracje** idą w komendzie builda (`prisma migrate deploy`), więc wdrożenie
   ze zmianą schematu samo dosuwa bazę.

`vercel.json` podnosi limit czasu funkcji generujących PDF — paczka
kilkudziesięciu dokumentów nie zmieści się w domyślnym oknie.

### Render

`render.yaml` w repo: build uruchamia `prisma migrate deploy`, a cron jest
osobną usługą blueprintu. Tu wystarcza sam `DATABASE_URL` na porcie 5432
i limiter w pamięci — usługa to jeden długo żyjący proces. Uwaga: darmowy plan
usypia serwis po 15 minutach i **nie obejmuje cron jobs**.

Wymagane zmienne: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST=true`.

Logowanie Google (opcjonalne): `AUTH_GOOGLE_ID` i `AUTH_GOOGLE_SECRET`
z Google Cloud → Credentials → OAuth client ID. W kliencie OAuth trzeba wpisać
adres powrotny `https://<domena>/api/auth/callback/google` — osobno dla każdego
środowiska, bo Google porównuje go znak w znak.

Dla finansów dochodzą: `CRON_SECRET` (bez niego `/api/cron/billing` jest
wyłączony), `RESEND_API_KEY` i `APP_URL` (linki w e-mailach do najemców).
Na Render cron jest w `render.yaml`; na Vercelu dopisz go do `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/billing", "schedule": "0 4 * * *" }] }
```

## Struktura

```
src/
  app/
    (auth)/          logowanie, rejestracja
    (app)/           panel właściciela (wymaga sesji)
    api/             endpointy REST
  components/
    ui/              komponenty bazowe (Button, Input, Card…)
    theme/           przełącznik i provider motywu
    brand/           logo
  lib/
    auth/            konfiguracja NextAuth, sesje, hasła, rejestracja
    api/             kształt odpowiedzi REST
    validations/     schematy Zod
  generated/prisma/  klient Prismy (generowany, poza gitem)
prisma/schema.prisma
```
