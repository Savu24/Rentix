-- AlterEnum
-- Rezerwacja: lokal trzymany dla najemcy, ale najem jeszcze nie trwa.
-- Wartosc ladnie miedzy szkicem a umowa aktywna, bo enum wyznacza tez
-- kolejnosc sortowania listy umow.
ALTER TYPE "LeaseStatus" ADD VALUE 'RESERVED' AFTER 'DRAFT';
