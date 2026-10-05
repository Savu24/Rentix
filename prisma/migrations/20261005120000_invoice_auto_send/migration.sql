-- Dokument zatwierdzony ze szkicu nie idzie sam do najemcy.
--
-- Szkic to dokument, który właściciel poprawiał ręcznie, więc o chwili
-- wysyłki decyduje on — przyciskiem na stronie dokumentu. Nocny przebieg
-- pomija dokumenty z "autoSend" = false, dopóki nie pójdzie pierwsza
-- wysyłka z panelu. Istniejące dokumenty zostają przy wysyłce automatycznej.

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "autoSend" BOOLEAN NOT NULL DEFAULT true;
