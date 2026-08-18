-- AlterTable
-- Ustawienia powiadomień per organizacja. Do tej pory harmonogram siedział
-- w stałych w `src/lib/notifications/schedule.ts`, więc jedno konto nie mogło
-- przypominać wcześniej niż inne — a rytm płatności bywa różny.
ALTER TABLE "organizations" ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "overdueRepeatDays" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
-- Treść powiadomień pisana przez wynajmującego. Kolumny tekstowe są NULL-owalne
-- celowo: NULL znaczy „użyj domyślnego tekstu z kodu". Gdyby domyślki wylądowały
-- tutaj przy zakładaniu konta, ich późniejsza poprawka nie dotarłaby do nikogo.
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "subject" TEXT,
    "heading" TEXT,
    "intro" TEXT,
    "outro" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Jeden szablon na rodzaj powiadomienia w organizacji. Ograniczenie jest tu
-- po to, żeby zapis mógł iść przez upsert bez wyścigu o drugi wiersz.
CREATE UNIQUE INDEX "email_templates_organizationId_type_key" ON "email_templates"("organizationId", "type");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
