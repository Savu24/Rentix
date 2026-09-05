-- Okres wypowiedzenia na umowie najmu.
--
-- Kolumna dopuszcza NULL i nie ma wartości domyślnej: umowy sprzed tej zmiany
-- nie mają zapisanego okresu, a wpisanie im czegokolwiek (choćby zera)
-- twierdziłoby, że strony coś ustaliły. NULL znaczy „terminy ustawowe".
ALTER TABLE "Lease" ADD COLUMN "noticePeriodMonths" INTEGER;
