-- Organizacja, w ktorej konto wlasnie pracuje.
--
-- Jedno konto bywa w kilku organizacjach: ktos prowadzi wlasny najem i pomaga
-- jeszcze dwom wynajmujacym. Token sesji niesie jedna wartosc, ustalona przy
-- logowaniu, wiec wybor musi mieszkac w bazie — inaczej przelaczenie dzialaloby
-- do najblizszego odswiezenia tokenu i rozjezdzalo sie miedzy urzadzeniami.
ALTER TABLE "users" ADD COLUMN "activeOrganizationId" TEXT;

-- SET NULL, a nie CASCADE: skasowanie organizacji nie ma kasowac konta, ktore
-- akurat mialo ja wybrana. Puste pole znaczy „pierwsza z brzegu".
ALTER TABLE "users" ADD CONSTRAINT "users_activeOrganizationId_fkey"
  FOREIGN KEY ("activeOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "users_activeOrganizationId_idx" ON "users"("activeOrganizationId");
