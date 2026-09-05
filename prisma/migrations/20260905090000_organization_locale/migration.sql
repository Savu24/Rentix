-- Wersja krajowa organizacji: język panelu i rodzaj dokumentów.
-- Konta zalozone przed wprowadzeniem wersji brytyjskiej sa polskie.
ALTER TABLE "organizations" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'pl';
