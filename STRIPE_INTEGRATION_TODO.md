# Stripe: co zostało do zrobienia

Ten plik to jedyne miejsce z krokami, które zostały do zrobienia po podłączeniu Stripe Checkout (formularz osadzony, `ui_mode: "form"`).

## Values to Replace

W kodzie nie ma placeholderów. Cenę wybiera się po `lookup_key`, a nie po wpisanym na sztywno `price_...`, więc zamiast zmian w kodzie wystarczy ustawić ceny w Stripe (patrz „Konfiguracja” niżej).

**Files containing placeholders:**
- [src/app/api/billing/checkout/route.ts](src/app/api/billing/checkout/route.ts): `mode` i `line_items` są już ustawione na prawdziwe wartości.

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | `subscription` | Nic do zmiany: plany RentixON to subskrypcja miesięczna. |
| line_items[].price | cena znaleziona po `lookup_key`: `start_monthly` / `pro_monthly` / `portfel_monthly` | Klucze ustawione w panelu Stripe muszą brzmieć dokładnie tak (patrz „Konfiguracja”). |

## Configured Parameters

Parametry ustawione w Checkout Studio są już wpisane w kod.

**Files containing these parameters:**
- [src/app/api/billing/checkout/route.ts](src/app/api/billing/checkout/route.ts)
- [src/lib/billing/stripe.ts](src/lib/billing/stripe.ts) (wersja API)
- [src/components/panel/settings/plan-checkout.tsx](src/components/panel/settings/plan-checkout.tsx) (Stripe.js, beta, appearance)

| Parameter | Value |
|-----------|-------|
| ui_mode | `form` (SDK `stripe` 23.0.0, czyli ≥ 21.0.0) |
| integration_identifier | `custom_embedded_web_0001` |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: false }` |
| automatic_tax | `{ enabled: false }` |
| payment_method_collection | `always` |
| submit_type | `auto` |
| API version | `2026-09-30.endive; custom_checkout_payment_form_preview=v1` |
| Stripe.js | `https://js.stripe.com/dahlia/stripe.js`, beta `custom_checkout_payment_form_1` |

## Konfiguracja

### 1. Zmienne środowiskowe

Lokalnie wpisz je do `.env`, na produkcji w panelu hostingu (Vercel / Render):

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- Klucze znajdziesz na https://dashboard.stripe.com/test/apikeys
- Oba klucze `sk_` i `pk_` ustawia się razem, inaczej aplikacja nie wystartuje (pilnuje tego `src/lib/env.ts`).
- Bez kluczy karta planu w ustawieniach wygląda tak jak przed integracją, z samymi progami i bez przycisków.
- `APP_URL` musi wskazywać publiczny adres aplikacji, bo od niego liczy się adres powrotu z płatności.

### 2. Produkty i ceny w Stripe

Ceny są na razie tylko polskie. Każda cena musi być **cykliczna, miesięczna, w PLN**, a jej **Lookup key** musi brzmieć dokładnie tak:

| Plan | Cena | Lookup key |
|------|------|------------|
| Start | 39 zł | `start_monthly` |
| Pro | 99 zł | `pro_monthly` |
| Portfel | 249 zł | `portfel_monthly` |

**Opłata od czynszu (0,1%).** Do planu płatnego doliczamy 0,1% całego miesięcznego czynszu z aktywnych umów, gdy wynosi on co najmniej 20 000 zł (próg i stawka: `RENT_FEE_THRESHOLD_GROSZE` i `RENT_FEE_RATE` w `src/lib/billing/plans.ts`). Plan Free jej nie płaci. Załóż w Stripe czwartą cenę:

| Pole | Wartość |
|------|---------|
| Produkt | np. „Opłata od czynszu” |
| Model cenowy | Per unit (za sztukę), **cykliczna, miesięczna**, PLN |
| Cena za sztukę | **0,01 zł** (1 grosz) |
| Lookup key | `rent_fee_monthly` |

Ilość sztuk to opłata w groszach. Przy 20 000 zł czynszu ilość wynosi 2000 (20 zł), przy 50 000 zł 5000 (50 zł). Poniżej 20 000 zł pozycji w subskrypcji nie ma wcale. Aplikacja sama ustawia ilość: przy zakupie, po zapłacie (webhook) i co noc (cron `/api/cron/billing`). Kwota idzie razem z planem przy każdym odnowieniu, według umów z dnia odnowienia, bez proporcji za część miesiąca. Bez tej ceny zakup planu jest zablokowany komunikatem „Płatności są chwilowo niedostępne”.

Klucze są wpisane w `PRICE_LOOKUP_KEYS` w [src/lib/billing/stripe.ts](src/lib/billing/stripe.ts). Kwoty muszą zgadzać się z `PLAN_PRICE` w [src/lib/billing/plans.ts](src/lib/billing/plans.ts), bo to te ceny widzi klient na przyciskach. Przy zmianie ceny tworzysz nową cenę w Stripe i przenosisz na nią lookup key (opcja „Transfer lookup key”), bez wdrażania kodu.

Ceny trzeba założyć osobno w trybie testowym i w trybie live, z tymi samymi kluczami.

**Wersja UK:** konta brytyjskie nie widzą na razie zakupu planu. Gdy dodasz ceny w funtach (£9 / £24 / £59), dopisz w `PRICE_LOOKUP_KEYS` wpis `uk` z ich kluczami.

### 3. Webhook

W https://dashboard.stripe.com/workbench/webhooks dodaj endpoint `https://<twoja-domena>/api/webhooks/stripe` ze zdarzeniami:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`

Jego sekret (`whsec_...`) wpisz jako `STRIPE_WEBHOOK_SECRET`.

Lokalnie zamiast tego uruchom Stripe CLI:

```
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 4. Portal klienta

Włącz Customer Portal na https://dashboard.stripe.com/test/settings/billing/portal: zmiana planu (dodaj wszystkie trzy produkty), aktualizacja karty, faktury i anulowanie na koniec okresu. Przycisk „Zarządzaj płatnościami” w ustawieniach otwiera właśnie ten portal.

## Nowe pliki

```
src/lib/billing/stripe.ts                        klient Stripe, lookup keys, zapis subskrypcji do bazy
src/lib/billing/__tests__/stripe.test.ts         test odwzorowania cen na plany
src/app/api/billing/checkout/route.ts            POST: sesja Checkout → { client_secret }
src/app/api/billing/portal/route.ts              POST: sesja portalu klienta → { url }
src/app/api/webhooks/stripe/route.ts             POST: webhook z weryfikacją podpisu
src/components/panel/settings/plan-checkout.tsx  formularz Stripe i przycisk portalu
```

Zmienione: `src/lib/env.ts`, `.env.example`, `plan-card.tsx`, strona `panel/ustawienia`, słowniki `pl.ts` i `uk.ts`, `next.config.ts` (`Permissions-Policy: payment` dopuszcza `js.stripe.com`, inaczej Apple Pay i Google Pay nie zadziałają w ramce Stripe).

## Jak to działa

1. Właściciel albo administrator organizacji otwiera **Ustawienia** i klika wyższy plan.
2. Przeglądarka ładuje Stripe.js z `js.stripe.com` i woła `POST /api/billing/checkout`. Serwer szuka ceny po lookup key (plan + wersja krajowa konta) i zakłada sesję Checkout z `organizationId` w metadanych.
3. Formularz Stripe montuje się w karcie planu. Po potwierdzeniu Stripe przekierowuje na `/panel/ustawienia?platnosc=…`, a strona pokazuje komunikat „płatność jest przetwarzana”.
4. Stripe wysyła webhook. `syncStripeSubscription` czyta bieżącą subskrypcję i zapisuje w tabeli `subscriptions` plan, status, koniec okresu i identyfikatory Stripe.
5. Zmiana planu, karty i rezygnacja idą przez portal klienta i wracają do konta tym samym webhookiem. Po anulowaniu konto spada na plan Free, a umowy zostają.

Statusy: `active` i `trialing` dają ACTIVE, `past_due`, `unpaid` i `paused` dają PAST_DUE (karta pokazuje ostrzeżenie), `canceled` daje CANCELLED i plan Free. Konta z `billingExempt` nie widzą zakupu, a API go odrzuca.

## Testowanie

Karty testowe (dowolna przyszła data ważności, dowolny CVC):

| Karta | Wynik |
|-------|-------|
| `4242 4242 4242 4242` | płatność udana |
| `4000 0025 0000 3155` | wymaga 3-D Secure |
| `4000 0000 0000 9995` | odrzucona (brak środków) |
| `4000 0000 0000 0341` | przyjęta przy zakupie, odrzucana przy odnowieniu (test PAST_DUE) |

Scenariusze do przeklikania w trybie testowym:

- [ ] Zakup Start na koncie Free, plan zmienia się po webhooku
- [ ] Przejście Start → Pro w portalu
- [ ] Anulowanie w portalu, po końcu okresu konto ma Free
- [ ] Nieudane odnowienie: status PAST_DUE i ostrzeżenie w karcie
- [ ] Ponowny zakup po anulowaniu
- [ ] Konto współpracownika (rola MEMBER) nie widzi przycisków
- [ ] `stripe trigger customer.subscription.updated`, żeby sprawdzić odporność na powtórki

## Następne kroki

- [ ] Polskie faktury VAT / KSeF: Stripe ich nie wystawia. Podłącz Fakturownię albo inFakt do zdarzenia `invoice.paid`.
- [ ] Decyzja o VAT i Stripe Tax: `automatic_tax` jest teraz wyłączony zgodnie z konfiguracją Studio. Dla UK sprawdź obowiązek rejestracji VAT.
- [ ] Maile: włącz w Stripe e-maile o udanej i nieudanej płatności albo dodaj własne w `src/lib/email`.
- [ ] Okres łaski przy PAST_DUE: dziś konto zachowuje plan aż do `canceled`. Ustaw w Stripe (Settings → Billing → Subscriptions), po ilu nieudanych próbach subskrypcja ma się anulować, i włącz Smart Retries.
- [ ] Panel admina: przychód liczy dziś z cennika. Można go oprzeć na subskrypcjach z `externalSubscriptionId`.
- [ ] Przed produkcją: klucze live, webhook live, ceny live z tymi samymi lookup keys, jeden prawdziwy zakup i zwrot.
- [ ] Aplikacje mobilne: nie pokazuj tam tego formularza (zasady App Store i Google Play, szczegóły w checkliście wydania).

## Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
