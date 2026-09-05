import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { InvoiceBatchDocument } from "@/lib/invoices/pdf";
import { toInvoicePdfData } from "@/lib/invoices/pdf-data";
import { getInvoicesForBatch, MAX_BATCH_PDF } from "@/lib/invoices/service";

export const runtime = "nodejs";

/**
 * GET /api/invoices/pdf?ids=a,b,c — paczka dokumentów w jednym pliku.
 *
 * Jeden PDF z dokumentem na stronę, a nie archiwum osobnych plików: paczkę
 * drukuje się i przesyła księgowemu jednym ruchem, a przeglądarka i tak pobiera
 * jeden plik na kliknięcie.
 *
 * GET, a nie POST, bo to zwykłe pobranie — link działa bez JavaScriptu
 * i bez pośredniczącego blob-a w pamięci przeglądarki.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.noInvoiceSelected);
  }

  if (ids.length > MAX_BATCH_PDF) {
    return apiError(
      "VALIDATION_ERROR",
      `Maksymalnie ${MAX_BATCH_PDF} dokumentów naraz. Zawęź listę filtrem i pobierz w częściach.`,
    );
  }

  const invoices = await getInvoicesForBatch(auth.organizationId, ids);

  // Żaden z podanych identyfikatorów nie należy do tej organizacji — to samo
  // co „nie znaleziono", bez zdradzania, że dokumenty istnieją u kogoś innego.
  if (invoices.length === 0) return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoices);

  const documents = invoices.map(toInvoicePdfData);
  const authorName = invoices[0]!.organization.name;

  const buffer = await renderToBuffer(InvoiceBatchDocument({ documents, authorName }));

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `rentix-dokumenty-${stamp}-${documents.length}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // Paczka idzie jako pobranie, nie podgląd — po to się ją robi.
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
