# Poczta w Rentiksie — domena, Resend i treści pisane przez wynajmującego

Stan na 2026-08-18. Dokument opisuje trzy rzeczy: co zrobić poza kodem (domena,
DNS, Resend), jak oddać treść wiadomości w ręce wynajmującego i jak przebudować
ustawienia na zakładki.

## Co już działa

| Element | Plik | Uwagi |
|---|---|---|
| Wysyłka | `src/lib/email/client.ts` | Resend, a gdy brak klucza — SMTP |
| Nadawca | `src/lib/email/sender.ts` | jeden adres platformy, nazwa z organizacji, Reply-To wynajmującego |
| Szablony | `src/lib/email/templates.ts` | trzy, zaszyte w kodzie |
| Reguła kiedy wysłać | `src/lib/notifications/schedule.ts` | `OVERDUE_REPEAT_DAYS = 7`, `ISSUED_NOTICE_MAX_AGE_DAYS = 14` |
| Kolejka i historia | model `Notification` | zapisuje też nieudane, więc cron ponawia |
| Wyzwalacz | `src/app/api/cron/billing/route.ts` | codziennie, autoryzacja `CRON_SECRET` |

Brakuje tylko zweryfikowanej domeny — bez niej `RESEND_API_KEY` nie ma z czego
wysyłać, a próby lądują w `notifications` ze statusem `FAILED`.

---

## Część 1. Domena i Resend

Kolejność ma znaczenie: DNS propaguje się godzinami, więc to zaczynamy pierwsze,
a kod piszemy w tym czasie.

### 1.1 Kup domenę

`.env.example` zakłada `rentix.com.pl`. Rejestratory z obsługą `.com.pl`: OVH,
nazwa.pl, home.pl — rząd wielkości 50–150 zł za pierwszy rok. Jedyne, co
naprawdę jest potrzebne, to **dostęp do edycji rekordów DNS**; jeśli rejestrator
go utrudnia, przełącz domenę na Cloudflare DNS (darmowe) i edytuj tam.

### 1.2 Zdecyduj: domena główna czy subdomena wysyłkowa

Zalecenie: wysyłaj z **subdomeny**, np. `powiadomienia.rentix.com.pl`, a nie
z `rentix.com.pl`. Powód: reputacja nadawcy liczy się per domena. Gdy kiedyś
z głównej domeny pójdzie newsletter albo poczta firmowa i coś oberwie za spam,
przypomnienia o czynszu nie idą na dno razem z nią. Odwrotnie też — kłopot
z wysyłką transakcyjną nie zabija firmowej skrzynki.

Wtedy `EMAIL_FROM="Rentix <powiadomienia@rentix.com.pl>"` zostaje bez zmian,
a w Resendzie dodajesz domenę `powiadomienia.rentix.com.pl`.

### 1.3 Załóż konto w Resend i dodaj domenę

1. resend.com → rejestracja.
2. Domains → Add Domain → wpisz subdomenę z punktu 1.2, wybierz region UE
   (bliżej odbiorców i czysto pod RODO).
3. Resend wyświetli zestaw rekordów do wklejenia u rejestratora. Nie przepisuj
   ich z tego dokumentu ani z pamięci — **skopiuj dokładnie te, które pokaże
   panel**, bo klucz DKIM jest generowany dla twojej domeny. Zestaw to zwykle:
   - `MX` na subdomenę odbić (bounce),
   - `TXT` ze `v=spf1 …` — mówi, że serwery Resendu mają prawo wysyłać w imieniu domeny,
   - `TXT` `resend._domainkey` — klucz publiczny DKIM, którym podpisywana jest każda wiadomość.
4. Wklej u rejestratora. Uwaga na pułapkę: część paneli sama dokleja nazwę
   domeny do pola „host". Jeśli Resend każe utworzyć `resend._domainkey`,
   a panel pokazuje potem `resend._domainkey.powiadomienia.rentix.com.pl`, jest
   dobrze; jeśli wpiszesz pełną nazwę ręcznie, wyjdzie ona podwójnie
   i weryfikacja padnie.
5. Kliknij Verify. Zwykle minuty, czasem do 48 h.

### 1.4 Dodaj DMARC

Osobny rekord `TXT` na `_dmarc.rentix.com.pl`. Zacznij łagodnie:

```
v=DMARC1; p=none; rua=mailto:dmarc@rentix.com.pl
```

`p=none` niczego nie odrzuca, tylko zbiera raporty. Gmail i Outlook przy
masowej wysyłce wymagają obecności DMARC, a `p=none` daje zgodność bez ryzyka,
że własna poczta zacznie znikać. Zaostrzenie do `p=quarantine` dopiero gdy
raporty przez kilka tygodni są czyste.

### 1.5 Klucz API i zmienne środowiskowe

W Resend: API Keys → Create → uprawnienie **Sending access**, nie Full access.
Klucz z prawem kasowania domen nie ma po co siedzieć na serwerze produkcyjnym.

Na Render/Vercel ustaw:

```
RESEND_API_KEY=re_...
EMAIL_FROM=Rentix <powiadomienia@rentix.com.pl>
CRON_SECRET=<długi losowy ciąg>
APP_URL=https://<adres aplikacji>
```

`SMTP_*` zostaw puste — gdy ustawione są obie drogi, `client.ts` i tak wybiera
Resend, a martwe zmienne mylą przy diagnozie.

### 1.6 Sprawdź, że wychodzi

1. W panelu wystaw dokument testowy na własny adres i użyj „wyślij" —
   `src/app/api/invoices/[id]/send/route.ts`.
2. W Resend → Emails zobaczysz wysyłkę i status dostarczenia.
3. W wiadomości u siebie: „pokaż oryginał" w Gmailu ma dać `SPF: PASS`,
   `DKIM: PASS`, `DMARC: PASS`. Dopóki którykolwiek jest `FAIL`, poczta działa,
   ale ląduje w spamie — i to jest ten moment na poprawkę, nie po pierwszej
   wysyłce do prawdziwego najemcy.
4. Dla pewności `mail-tester.com` — wysyłasz na ich adres i dostajesz punktację
   z listą braków.

### 1.7 Cron na produkcji

Render Cron Job albo Vercel Cron, codziennie rano:

```
curl -X POST https://<APP_URL>/api/cron/billing \
  -H "Authorization: Bearer $CRON_SECRET"
```

Bez tego przypomnienia nie wyjdą nigdy — kod jest, ale nikt go nie budzi.

### 1.8 Limity

Darmowy plan Resendu ma dzienny i miesięczny limit wysyłek; aktualne wartości
sprawdź na resend.com/pricing, bo się zmieniają. Przy kilkudziesięciu najemcach
i najwyżej jednej wiadomości dziennie na dokument darmowy plan wystarcza
z zapasem.

---

## Część 2. Treść pisana przez wynajmującego

### Decyzja: bez szkiców do zatwierdzenia

Wcześniejszy pomysł zakładał kolejkę szkiców, które wynajmujący przegląda przed
wysyłką. Odrzucamy go: przypomnienie o czynszu ma wyjść rano bez udziału
człowieka, a szkic czekający na zatwierdzenie zamienia automat w listę zadań.
Zamiast tego wynajmujący **raz** pisze, co ma być w wiadomości, a system wysyła
to bez pytania.

### Co jest edytowalne, a co nie

Szablon w `templates.ts` ma już dokładnie te miejsca, które warto oddać:

| Element | Kto ustala | Dlaczego |
|---|---|---|
| `subject` — temat | wynajmujący | |
| `heading` — nadpis nad treścią | wynajmujący | |
| `intro` — akapit powitalny | wynajmujący | |
| `outro` — akapit zamykający | wynajmujący | |
| Tabela: numer, kwota, termin | system | to są dane z faktury, nie tekst |
| Rama HTML, kolory, układ | system | poprawność w Outlooku i Gmailu |
| Stopka „wysłano automatycznie z systemu Rentix" | system | |

Wynajmujący pisze **zwykły tekst**, nie HTML. Dwa powody: nie umie i nie ma
obowiązku umieć, a tekst wklejony przez użytkownika prosto do HTML-a wiadomości
to otwarte wstrzyknięcie znaczników. Treść z bazy escapujemy przed wstawieniem
w ramę.

### Zmienne w treści

Whitelist, po polsku, w klamrach:

```
{{imie_najemcy}}    {{nazwisko_najemcy}}   {{nazwa_wynajmujacego}}
{{numer_dokumentu}} {{kwota}}              {{do_zaplaty}}
{{termin}}          {{okres}}              {{dni_po_terminie}}
{{adres_lokalu}}
```

Podmiana przez prosty resolver z mapą — bez silnika szablonów wykonującego kod.
Nieznana zmienna nie może wywalić wysyłki: zostaje wtedy pusty ciąg, a walidacja
w formularzu ostrzega przy zapisie, nie o szóstej rano w cronie.

### Schemat bazy

```prisma
model EmailTemplate {
  id             String           @id @default(cuid())
  organizationId String
  type           NotificationType

  /// Puste pole = użyj domyślnego tekstu z kodu. Nie kopiujemy domyślek do
  /// bazy przy zakładaniu konta — inaczej poprawka literówki w domyślnym
  /// tekście nigdy nie dotarłaby do istniejących kont.
  subject String?
  heading String?
  intro   String? @db.Text
  outro   String? @db.Text

  /// Wyłączony rodzaj powiadomienia nie wychodzi wcale.
  enabled Boolean @default(true)

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, type])
  @@map("email_templates")
}
```

Na `Organization` dochodzą ustawienia harmonogramu, dziś stałe w kodzie:

```prisma
  /// Ile dni przed terminem wysłać przypomnienie. Dziś DUE_SOON_DAYS w kodzie.
  reminderDaysBefore Int @default(3)
  /// Co ile dni ponawiać wezwanie po terminie. Dziś OVERDUE_REPEAT_DAYS = 7.
  overdueRepeatDays  Int @default(7)
  /// Nazwa w polu nadawcy, gdy ma się różnić od nazwy organizacji.
  senderName         String?
```

`chooseNotification` w `schedule.ts` przyjmuje wtedy te dwie liczby argumentem
zamiast czytać stałe — funkcja zostaje czysta i dalej testowalna.

### Kolejność robót w kodzie

1. Migracja Prismy: `EmailTemplate` + trzy pola na `Organization`.
2. `src/lib/email/render.ts` — resolver zmiennych i escapowanie, z testami
   (jest już `src/lib/email/__tests__/`, więc konwencja gotowa).
3. `templates.ts` przyjmuje nadpisania: brak wpisu → dotychczasowy tekst.
   Zero zmian w wyglądzie dla kont, które niczego nie ustawiły.
4. `reminders.ts` dociąga szablon organizacji i pomija typy z `enabled = false`.
5. `schedule.ts` na parametrach zamiast stałych.
6. UI: edytor, podgląd, „wyślij test do siebie".

Podgląd na żywo obok pola edycji jest tu ważniejszy niż zwykle: wynajmujący
pisze tekst, którego sam nigdy nie zobaczy w skrzynce, a wyśle go do
kilkudziesięciu osób. Podgląd renderujemy tą samą funkcją co wysyłkę — na
danych z ostatniej prawdziwej faktury, a na świeżym koncie na przykładowych.

---

## Część 3. Ustawienia z zakładkami

Dziś `src/app/(app)/panel/ustawienia/page.tsx` to jedna strona i cztery
formularze pod sobą. Po dołożeniu szablonów i harmonogramu zrobi się z tego
kilometr scrolla.

### Podział na zakładki

| Zakładka | Ścieżka | Zawartość |
|---|---|---|
| Organizacja | `/panel/ustawienia` | nazwa, adres kontaktowy, NIP, adres wystawcy |
| Powiadomienia | `/panel/ustawienia/powiadomienia` | włącz/wyłącz rodzaje, dni przed terminem, ponawianie |
| Wiadomości | `/panel/ustawienia/wiadomosci` | edytor treści per rodzaj, podgląd, test |
| Konto | `/panel/ustawienia/konto` | profil, hasło, usunięcie konta |

### Zakładki jako trasy, nie jako stan komponentu

Zakładki robimy na zagnieżdżonym `layout.tsx` z `<Link>` i `usePathname`, a nie
na `useState`. Trzy powody: każda zakładka zostaje komponentem serwerowym
i dociąga własne dane (edytor szablonów potrzebuje wpisów, których reszta
ustawień nie potrzebuje), zapis formularza nie gubi miejsca po odświeżeniu,
a do konkretnej zakładki da się odesłać linkiem z alertu „uzupełnij dane
wystawcy".

```
src/app/(app)/panel/ustawienia/
  layout.tsx          ← nagłówek i pasek zakładek
  page.tsx            ← Organizacja
  powiadomienia/page.tsx
  wiadomosci/page.tsx
  konto/page.tsx
```

Na wąskim ekranie pasek zakładek przewija się poziomo — nie zwija do rozwijanej
listy, bo cztery pozycje mieszczą się w jednym rzucie oka.

---

## Kolejność całości

1. **Domena, DNS, Resend** (część 1) — do zrobienia, czeka na zakup domeny.
2. ~~**Zakładki** (część 3)~~ — zrobione 2026-08-18.
3. ~~**Szablony** (część 2)~~ — zrobione 2026-08-18.
4. ~~**Harmonogram w ustawieniach**~~ — zrobione 2026-08-18.

## Co powstało (2026-08-18)

| Plik | Rola |
|---|---|
| `prisma/migrations/20260818210000_email_templates/` | tabela `email_templates`, trzy kolumny na `organizations` |
| `src/lib/email/render.ts` | podstawianie zmiennych, escapowanie, walidacja nazw |
| `src/lib/email/sample.ts` | przykładowy dokument do podglądu |
| `src/lib/email/templates.ts` | `DEFAULT_FIELDS` + nadpisania z bazy |
| `src/lib/notifications/types.ts` | stałe rodzajów, wolne od Prismy (bundel przeglądarki) |
| `src/lib/notifications/settings.ts` | ustawienia poczty organizacji, z pamięcią na przebieg |
| `src/lib/notifications/service.ts` | dane panelu, zapis, test wysyłki |
| `src/app/api/notifications/{settings,templates,test}/` | trzy trasy API |
| `src/app/(app)/panel/ustawienia/{,powiadomienia,wiadomosci,konto}/` | cztery zakładki |
| `src/components/panel/settings/{settings-tabs,notification-form,notification-toggles,template-editor}.tsx` | UI |

Podgląd wiadomości liczy się **w przeglądarce**, nie na serwerze: `templates.ts`
nie ciągnie ani bazy, ani bramki pocztowej, a `money.ts` nie ma importów, więc
całość mieści się w bundlu strony i przerysowuje pod palcami.

### Zanim to ruszy lokalnie

Migracja jest zapisana, ale nie zastosowana do bazy:

```
npm run db:migrate     # dev
npm run db:deploy      # produkcja (robi to też `npm run build`)
```
