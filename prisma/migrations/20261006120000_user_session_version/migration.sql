-- Wersja sesji konta.
--
-- Token sesji (JWT) żyje trzydzieści dni i odświeża się przy każdej wizycie,
-- więc sam z siebie nie wie, że konto zmieniło właściciela. Podbicie tej
-- liczby unieważnia wszystkie wydane tokeny naraz. Pierwsze zastosowanie:
-- połączenie konta z Google, gdy konto z hasłem założono na niepotwierdzony
-- adres — hasło i sesje osoby, która je zakładała, przestają wtedy działać.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
