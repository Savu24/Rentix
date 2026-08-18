# Resend krok po kroku — po zakupie rentix.com.pl

Instrukcja operacyjna. Wszystko poniżej robisz w przeglądarce i w panelu
hostingu; w kodzie nie ma nic do zmiany poza jedną zmienną środowiskową.

Zakładam domenę **rentix.com.pl** i wysyłkę z subdomeny
**powiadomienia.rentix.com.pl**.

---

## Krok 0. Dlaczego subdomena, a nie domena główna

Reputacja nadawcy liczy się osobno dla każdej domeny. Jeśli kiedyś z
`rentix.com.pl` pójdzie newsletter, mailing do inwestorów albo poczta firmowa
i oberwie za spam, przypomnienia o czynszu nie idą na dno razem z nią. Odwrotnie
też: kłopot z wysyłką transakcyjną nie zabija firmowej skrzynki.

Adres nadawcy zostaje więc taki, jaki już jest w `.env.example`:

```
EMAIL_FROM="Rentix <powiadomienia@rentix.com.pl>"
```

Uwaga na rozróżnienie, bo łatwo je pomylić:

- **domena w Resendzie**: `powiadomienia.rentix.com.pl` (subdomena)
- **adres nadawcy**: `powiadomienia@rentix.com.pl` (skrzynka na domenie głównej)

To dwie różne rzeczy i muszą być spójne. Jeśli w Resendzie dodasz subdomenę
`powiadomienia.rentix.com.pl`, to adres nadawcy musi być **na tej subdomenie**,
czyli np. `czynsz@powiadomienia.rentix.com.pl`. Masz dwie drogi:

| Droga | Domena w Resendzie | `EMAIL_FROM` |
|---|---|---|
| A — prościej | `rentix.com.pl` | `Rentix <powiadomienia@rentix.com.pl>` |
| B — czyściej | `powiadomienia.rentix.com.pl` | `Rentix <czynsz@powiadomienia.rentix.com.pl>` |

**Wybierz A, jeśli `rentix.com.pl` nie będzie służyć do niczego innego** — a na
starcie nie będzie. Wtedy `EMAIL_FROM` zostaje bez zmian i nie ruszasz kodu
wcale. Do B przejdziesz, gdy dojdzie newsletter albo poczta firmowa; to zmiana
jednej zmiennej środowiskowej, nie przebudowa.

Dalsza część opisuje **drogę A**.

---

## Krok 1. Konto w Resend

1. Wejdź na resend.com, załóż konto (może być przez GitHub).
2. Potwierdź adres e-mail.
3. Nie wybieraj jeszcze planu płatnego — darmowy wystarcza na start.

## Krok 2. Dodaj domenę

1. W panelu: **Domains → Add Domain**.
2. Wpisz `rentix.com.pl`.
3. Region: wybierz **eu-west-1 (Ireland)**. Bliżej odbiorców i dane nie
   wychodzą poza UE, co przy adresach najemców ma znaczenie pod RODO.
4. Zatwierdź.

Resend pokaże teraz listę rekordów DNS do wklejenia. **Nie przepisuj ich
z tej instrukcji** — klucz DKIM jest generowany indywidualnie dla twojej domeny
i tylko panel zna jego wartość. Zobaczysz mniej więcej takie pozycje:

| Typ | Nazwa (host) | Wartość |
|---|---|---|
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (priorytet 10) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSq…` (długi ciąg) |

## Krok 3. Wklej rekordy u rejestratora

Wchodzisz do panelu DNS tam, gdzie kupiłeś domenę (OVH, nazwa.pl, home.pl).
Jeśli panel jest toporny, przenieś obsługę DNS na Cloudflare — darmowe
i wygodniejsze.

**Pułapka numer jeden, na której wykłada się większość ludzi:** część paneli
sama dokleja nazwę domeny do pola „host". Jeśli Resend każe utworzyć rekord
o nazwie `resend._domainkey`, to wpisujesz dokładnie `resend._domainkey`,
a panel sam zrobi z tego `resend._domainkey.rentix.com.pl`. Jeśli wpiszesz pełną
nazwę ręcznie, wyjdzie `resend._domainkey.rentix.com.pl.rentix.com.pl`
i weryfikacja nigdy nie przejdzie — a komunikat błędu tego nie powie.

Po wklejeniu sprawdź sobie z konsoli, czy rekordy widać:

```
nslookup -type=TXT resend._domainkey.rentix.com.pl
nslookup -type=TXT send.rentix.com.pl
nslookup -type=MX send.rentix.com.pl
```

Jeśli `nslookup` ich nie widzi, Resend też nie zobaczy. Poczekaj i sprawdź
ponownie — propagacja to zwykle minuty, ale bywa do 48 godzin.

## Krok 4. Kliknij Verify

W panelu Resendu: **Domains → rentix.com.pl → Verify**. Zielony status przy
wszystkich rekordach oznacza, że możesz wysyłać.

## Krok 5. Dodaj DMARC

Osobny rekord, którego Resend nie wymaga, ale Gmail i Outlook owszem — przy
wysyłce masowej brak DMARC to prosta droga do folderu ze spamem.

| Typ | Nazwa | Wartość |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@rentix.com.pl` |

`p=none` nie odrzuca niczego, tylko zbiera raporty. To celowo najłagodniejsze
ustawienie: zaostrzenie do `p=quarantine` ma sens dopiero, gdy przez kilka
tygodni raporty są czyste. Odwrotna kolejność kończy się tym, że własna poczta
zaczyna znikać i nie wiadomo dlaczego.

Skrzynka `dmarc@rentix.com.pl` musi istnieć albo mieć przekierowanie —
inaczej raporty odbijają się w próżnię.

## Krok 6. Klucz API

1. **API Keys → Create API Key**.
2. Nazwa: `rentix-produkcja`.
3. Uprawnienie: **Sending access**, nie Full access. Klucz z prawem kasowania
   domen nie ma po co siedzieć na serwerze.
4. Domena: ogranicz do `rentix.com.pl`.
5. Skopiuj klucz **od razu** — panel pokaże go tylko raz. Zaczyna się od `re_`.

## Krok 7. Zmienne środowiskowe na produkcji

W panelu Render (albo Vercel), w sekcji Environment:

```
RESEND_API_KEY=re_...                                  ← z kroku 6
EMAIL_FROM=Rentix <powiadomienia@rentix.com.pl>
CRON_SECRET=<długi losowy ciąg>
APP_URL=https://<adres twojej aplikacji>
```

`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` zostaw **puste**. Kod wybiera Resend,
gdy jest klucz, więc wypełniony SMTP nic nie zmieni, a przy diagnozie awarii
będzie mylił, sugerując drogę, którą nic nie idzie.

Losowy `CRON_SECRET` wygenerujesz sobie tak:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Po zapisaniu zmiennych zrestartuj usługę — Render nie podłącza ich w locie.

## Krok 8. Sprawdź, że wychodzi

1. Wejdź w panel Rentiksa: **Ustawienia → Wiadomości**.
2. Kliknij **„Wyślij test do siebie"** przy dowolnym rodzaju wiadomości.
3. Sprawdź skrzynkę.

Jeśli test nie dojdzie, zajrzyj w Resend → **Emails**. Zobaczysz tam każdą
wysyłkę i powód odrzucenia — to jest miejsce diagnozy, nie logi aplikacji.

## Krok 9. Sprawdź uwierzytelnienie, zanim napiszesz do najemcy

To jest krok, którego nie wolno pominąć. Wiadomość, która „dochodzi", i taka,
która dochodzi **do skrzynki odbiorczej**, to dwie różne rzeczy.

W Gmailu otwórz testową wiadomość → menu trzech kropek → **Pokaż oryginał**.
Muszą być trzy zielone:

```
SPF:   PASS
DKIM:  PASS
DMARC: PASS
```

Każdy `FAIL` albo `NEUTRAL` oznacza źle wklejony rekord z kroku 3 — wróć tam.

Dla pewności wyślij jeszcze test na adres z **mail-tester.com**: dostaniesz
punktację z listą braków. Poniżej 8/10 warto poprawiać.

## Krok 10. Cron na produkcji

Bez tego przypomnienia nie wyjdą **nigdy** — kod jest, ale nikt go nie budzi.

W Render: **New → Cron Job**, harmonogram `0 7 * * *` (codziennie 7:00 UTC,
czyli 9:00 latem w Polsce), komenda:

```
curl -fsS -X POST https://<APP_URL>/api/cron/billing \
  -H "Authorization: Bearer $CRON_SECRET"
```

Ten sam `CRON_SECRET` co w kroku 7. Zadanie musi mieć tę zmienną ustawioną
u siebie — cron job na Renderze ma własne środowisko, nie dziedziczy zmiennych
z usługi webowej.

Codziennie, a nie raz w miesiącu: umowy mają różne dni naliczania, a
przypomnienia o terminach muszą wychodzić na bieżąco. Oba kroki są
idempotentne, więc powtórzony przebieg niczego nie zdubluje.

## Krok 11. Limity

Darmowy plan ma dzienny i miesięczny limit wysyłek — aktualne wartości sprawdź
na resend.com/pricing, bo się zmieniają. Przy kilkudziesięciu najemcach
i najwyżej jednej wiadomości dziennie na dokument darmowy plan wystarcza
z zapasem.

---

## Ściąga: co gdzie ustawić

| Gdzie | Co |
|---|---|
| Rejestrator / Cloudflare | 3 rekordy z Resendu + DMARC |
| Resend | domena `rentix.com.pl`, klucz API z Sending access |
| Render → usługa web | `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `APP_URL` |
| Render → cron job | `CRON_SECRET`, komenda `curl` z kroku 10 |
| Panel Rentiksa | Ustawienia → Organizacja: adres kontaktowy (Reply-To) |

Ostatni wiersz jest łatwy do przeoczenia, a bez niego odpowiedź najemcy na
powiadomienie trafia na skrzynkę platformy zamiast do wynajmującego. Zakładka
Powiadomienia pokazuje ostrzeżenie, gdy to pole jest puste.
