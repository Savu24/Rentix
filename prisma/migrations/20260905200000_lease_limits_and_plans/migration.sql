-- Cennik czterostopniowy i limit liczony umowami, nie najemcami.
--
-- Metryka zmienia sie z najemcy na umowe: najem pokojowy to pieciu najemcow
-- na jednym mieszkaniu, czyli piec razy drozsze konto przy tej samej pracy
-- panelu. Umowa jest tez jednostka, ktora wynajmujacy liczy sam.

-- Nowe progi obok istniejacych FREE i PRO.
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'START';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'PORTFOLIO';

ALTER TABLE "subscriptions" ADD COLUMN "leaseLimit" INTEGER;

-- Konta sprzed cennika dostaly obietnice "20 najemcow za darmo, na zawsze".
-- Zapisujemy im dwadziescia umow wprost w wierszu, wiec domyslne dwie z kodu
-- ich nie dotkna.
UPDATE "subscriptions" SET "leaseLimit" = 20;

-- Rejestracja nie zakladala subskrypcji, wiec konta z produkcji nie maja
-- wiersza w ogole. Bez tego wpadlyby na domyslny prog nowego planu Free
-- i obietnica przepadlaby po cichu.
INSERT INTO "subscriptions" ("id", "organizationId", "plan", "status", "leaseLimit", "createdAt", "updatedAt")
SELECT
  -- Identyfikator wyprowadzony z organizacji, a nie losowy: migracja
  -- puszczona drugi raz nie zdubluje wierszy, a rozszerzenie do losowych
  -- UUID-ow nie jest tu potrzebne.
  concat('sub_', o."id"),
  o."id",
  'FREE',
  'ACTIVE',
  20,
  NOW(),
  NOW()
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "subscriptions" s WHERE s."organizationId" = o."id"
);

-- Stara metryka. Nigdzie nie byla czytana, wiec nie ma czego przenosic.
ALTER TABLE "subscriptions" DROP COLUMN "tenantLimit";
ALTER TABLE "subscriptions" DROP COLUMN "propertyLimit";
