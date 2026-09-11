import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { CleaningScheduleDocument, cleaningPdfFilename } from "@/lib/cleaning/pdf";
import { cleaningPrintout } from "@/lib/cleaning/service";

// Osadzanie fontu czyta plik TTF z dysku — to wymaga runtime'u Node.
export const runtime = "nodejs";

/**
 * GET /api/properties/:id/cleaning/pdf — rozpiska do wydruku.
 *
 * Osobna trasa obok `../cleaning`, bo to inny format tej samej rzeczy: tamta
 * karmi tabelę w panelu JSON-em, ta wydaje kartkę na lodówkę. Kartka niesie
 * cały harmonogram — nieruchomość ma jeden naraz, więc nie ma czego wybierać.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const printout = await cleaningPrintout(auth.organizationId, id);

  if (!printout) return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);

  // Brak rozpiski to nie błąd danych — przycisk pobierania stoi wtedy schowany,
  // więc tutaj trafia adres otwarty z zakładki albo z pamięci przeglądarki.
  // Pusta kartka nie powiedziałaby, czego brakuje.
  if (!printout.range) return apiError("NOT_FOUND", auth.d.panel.api.cleaningEmpty);

  const data = {
    locale: auth.locale,
    propertyName: printout.propertyName,
    propertyAddress: printout.propertyAddress,
    organizationName: printout.organizationName,
    range: printout.range,
    duties: printout.duties,
  };

  const buffer = await renderToBuffer(CleaningScheduleDocument({ data }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // `attachment`, a nie `inline` jak przy fakturze: rozpiskę się drukuje
      // i wiesza, a nie ogląda w przeglądarce — przycisk mówi „pobierz" i ma
      // po kliknięciu zostawić plik na dysku, nie otworzyć kolejną kartę.
      "Content-Disposition": `attachment; filename="${cleaningPdfFilename(data)}"`,
      "Cache-Control": "no-store",
    },
  });
}
