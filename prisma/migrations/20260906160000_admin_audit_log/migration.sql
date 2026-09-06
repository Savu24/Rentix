-- Dziennik zmian wykonanych z panelu administratora platformy.
--
-- Bez kluczy obcych do "users" i "organizations": wpis ma przezyc skasowanie
-- obu stron, bo najciekawsze pytania padaja wlasnie o konta, ktorych juz nie
-- ma. Stad "actorEmail" i "targetLabel" kopiowane na sztywno przy zapisie.

CREATE TYPE "AdminAction" AS ENUM (
  'PLAN_CHANGED',
  'LEASE_LIMIT_CHANGED',
  'BILLING_EXEMPT_CHANGED',
  'SUBSCRIPTION_STATUS_CHANGED',
  'USER_ROLE_CHANGED',
  'USER_EMAIL_VERIFIED'
);

CREATE TYPE "AdminTargetType" AS ENUM ('ORGANIZATION', 'USER');

CREATE TABLE "admin_audit_logs" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "action" "AdminAction" NOT NULL,
  "targetType" "AdminTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetLabel" TEXT NOT NULL,
  "before" TEXT,
  "after" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Dziennik czyta sie od konca, wiec indeks po dacie malejaco obsluguje widok
-- glowny, a para (typ, id) — historie jednego konta albo jednej organizacji.
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");
CREATE INDEX "admin_audit_logs_targetType_targetId_idx" ON "admin_audit_logs"("targetType", "targetId");
