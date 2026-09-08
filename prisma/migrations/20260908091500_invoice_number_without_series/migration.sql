-- Zdejmuje serie "FV" z numerow faktur juz wystawionych.
--
-- Numer faktury nie nosi juz liter serii: nad numerem stoi na dokumencie
-- slowo "Faktura", wiec "FV" mowilo to samo drugi raz. Dokumenty wystawione
-- wczesniej zostawaly z dawnym zapisem i rejestr pokazywalby dwie konwencje
-- obok siebie -- w tym pierwsza fakture kazdego miesiaca dwa razy pod tym
-- samym numerem porzadkowym, raz z "FV", raz bez.
--
-- Zakres jest waski i celowo:
--
-- 1. TYLKO KONTA "miret". Numer wystawionego dokumentu to zapis w rejestrze
--    i u kogos, kto oddal juz faktury do ksiegowosci, przepisanie go byloby
--    rozjechaniem jego ksiag z dokumentami, ktore ma na papierze. Konto miret
--    tych dokumentow jeszcze nie rozliczylo -- stad zgoda na ich poprawe,
--    ta sama, ktora otwiera przycisk "Popraw numer".
--
-- 2. TYLKO NUMERY ZACZYNAJACE SIE OD "FV". Numery poprawione recznie na zapis
--    biura rachunkowego zostaja nietkniete.
--
-- 3. Z POMINIECIEM KOLIZJI. Gdyby numer bez serii nosil juz inny dokument,
--    ten zostaje ze swoim -- inaczej UPDATE wywrocilby sie na @@unique
--    i cale wdrozenie stanelo. Takie pojedyncze przypadki poprawia sie
--    z panelu.
--
-- Uruchomienie po raz drugi nie ma juz czego zmienic.

UPDATE "invoices" AS i
SET "number" = regexp_replace(i."number", '^FV\s+', '')
FROM "organizations" AS o
WHERE o."id" = i."organizationId"
  AND (o."slug" = 'miret' OR o."slug" LIKE 'miret-%')
  AND i."kind" = 'VAT_INVOICE'
  AND i."number" ~ '^FV\s+'
  AND NOT EXISTS (
    SELECT 1
    FROM "invoices" AS taken
    WHERE taken."organizationId" = i."organizationId"
      AND taken."id" <> i."id"
      AND taken."number" = regexp_replace(i."number", '^FV\s+', '')
  );
