-- Zaproszenia: wspolpracownik do organizacji i najemca do portalu.
--
-- Jedna tabela na oba przypadki. Mechanika jest wspolna w calosci — token
-- jednorazowy, termin waznosci, strona akceptacji, zalozenie konta — a rozni
-- sie wylacznie zapis koncowy: czlonkostwo albo dowiazanie kartoteki najemcy.
CREATE TYPE "InvitationKind" AS ENUM ('TEAM', 'TENANT');

CREATE TABLE "invitations" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "kind"           "InvitationKind" NOT NULL,
  "email"          TEXT NOT NULL,
  -- Rola tylko dla TEAM, kartoteka tylko dla TENANT — stad oba NULLowalne.
  "role"           "MembershipRole",
  "tenantId"       TEXT,
  -- SHA-256 tokenu z linku, nigdy sam token: link laduje w cudzej skrzynce,
  -- a wyciek bazy nie ma dawac wejscia na cudze konto.
  "tokenHash"      TEXT NOT NULL,
  "invitedById"    TEXT,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "acceptedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitations_tokenHash_key" ON "invitations"("tokenHash");
-- Glowne zapytanie obu list: oczekujace zaproszenia danego rodzaju.
CREATE INDEX "invitations_organizationId_kind_acceptedAt_idx" ON "invitations"("organizationId", "kind", "acceptedAt");
CREATE INDEX "invitations_tenantId_idx" ON "invitations"("tenantId");
-- Sprzatanie wygaslych.
CREATE INDEX "invitations_expiresAt_idx" ON "invitations"("expiresAt");

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Kasowanie kartoteki najemcy zabiera ze soba jego zaproszenie: link
-- prowadzilby do profilu, ktorego juz nie ma.
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zaproszenie zostaje wazne po skasowaniu konta osoby zapraszajacej: wpuszcza
-- do organizacji, a nie do jej konta.
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
