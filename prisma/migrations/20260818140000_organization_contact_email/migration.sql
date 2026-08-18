-- AlterTable
-- Adres kontaktowy wynajmującego. Powiadomienia wychodzą z adresu platformy
-- (tylko jej domena ma SPF i DKIM), więc bez tego pola odpowiedź najemcy
-- trafiałaby do platformy zamiast do wynajmującego, którego sprawa dotyczy.
ALTER TABLE "organizations" ADD COLUMN     "contactEmail" TEXT;
