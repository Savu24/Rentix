-- Kopia wysłanej wiadomości przy wpisie w "notifications".
--
-- Zakładka „Wiadomości" pokazuje każdy e-mail tak, jak poszedł: nadawcę,
-- adres odpowiedzi, HTML i załączniki, a do tego status dostawy z Resend
-- (po identyfikatorze wiadomości). Kolumny są opcjonalne — stare wiersze
-- zostają bez kopii i panel pokazuje dla nich wersję tekstową.

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "fromAddress" TEXT,
ADD COLUMN "replyTo" TEXT,
ADD COLUMN "html" TEXT,
ADD COLUMN "attachmentNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "providerId" TEXT,
ADD COLUMN "deliveryEvent" TEXT;
