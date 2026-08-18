-- AlterEnum
-- Czynsz płacony właścicielowi przy podnajmie. Postgres pozwala tylko dopisać
-- wartość do typu wyliczeniowego, nigdy wstawić ją w środek — kolejność
-- na liście wyboru ustala aplikacja (EXPENSE_CATEGORY_ORDER), nie baza.
ALTER TYPE "ExpenseCategory" ADD VALUE 'RENT';
