-- Okres wypowiedzenia na umowie najmu.
--
-- Kolumna dopuszcza NULL i nie ma wartosci domyslnej: umowy sprzed tej zmiany
-- nie maja zapisanego okresu, a wpisanie im czegokolwiek (chocby zera)
-- twierdziloby, ze strony cos ustalily. NULL znaczy "terminy ustawowe".
ALTER TABLE "leases" ADD COLUMN "noticePeriodMonths" INTEGER;
