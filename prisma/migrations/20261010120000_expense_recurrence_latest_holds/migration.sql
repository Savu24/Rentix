-- Wzorcem serii kosztow cyklicznych staje sie jej najnowsza pozycja.
--
-- Dotad cykl trzymala pierwsza, recznie wpisana pozycja, a kolejne kopiowaly
-- jej kwote. Zmiana stawki (gaz drozszy od pazdziernika) wymagala edycji tej
-- pierwszej pozycji, wiec przepisywala tez miesiac, w ktorym obowiazywala
-- jeszcze stara kwota. Odtad cykl wedruje z naliczeniem na nowa pozycje.
--
-- Tutaj przenosimy cykl w istniejacych seriach na ich najnowsze wystapienie.
-- Pozycji, ktora ma juz wlasny cykl, nie ruszamy, zeby nie nadpisac drugiej serii.
WITH latest AS (
  SELECT DISTINCT ON (o."recurringFromId") o."id", o."recurringFromId" AS "templateId"
  FROM "expenses" o
  JOIN "expenses" t ON t."id" = o."recurringFromId"
  WHERE t."recurrence" IS NOT NULL
    AND t."recurringFromId" IS NULL
    AND o."recurrence" IS NULL
    AND o."paidAt" >= t."paidAt"
  ORDER BY o."recurringFromId", o."paidAt" DESC, o."createdAt" DESC
),
moved AS (
  UPDATE "expenses" o
  SET "recurrence" = t."recurrence",
      "recurrenceEveryDays" = t."recurrenceEveryDays",
      "recurrenceNextAt" = t."recurrenceNextAt"
  FROM latest l
  JOIN "expenses" t ON t."id" = l."templateId"
  WHERE o."id" = l."id"
  RETURNING l."templateId"
)
UPDATE "expenses" t
SET "recurrence" = NULL,
    "recurrenceEveryDays" = NULL,
    "recurrenceNextAt" = NULL
FROM moved m
WHERE t."id" = m."templateId";
