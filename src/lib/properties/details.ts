/**
 * Drobne dane nieruchomości do wyświetlenia: odległości i współrzędne.
 *
 * Osobno od `address.ts`, bo to nie jest adres — to rzeczy, które karta
 * pokazuje obok niego, a które trzeba sformatować tak samo na karcie
 * i w przyszłym ogłoszeniu.
 */

/**
 * Odległość w metrach → „350 m" albo „1,2 km".
 *
 * Próg na kilometrze, bo „1300 m" nikt tak nie mówi, a „0,3 km" tym bardziej.
 * Przecinek dziesiętny, jak wszędzie w polskim interfejsie.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;

  const km = meters / 1000;
  // Pełne kilometry bez ogona: „2 km", nie „2,0 km".
  const value = Number.isInteger(km) ? String(km) : km.toFixed(1);
  return `${value.replace(".", ",")} km`;
}

/**
 * Link do map z zapisanych współrzędnych.
 *
 * Współrzędne leżą w bazie jako „52.2297, 21.0122" (patrz `coordinatesSchema`),
 * więc spacja musi zniknąć — z nią adres URL prowadzi do wyszukiwania tekstu,
 * a nie do punktu na mapie.
 */
export function mapsUrl(coordinates: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(coordinates.replace(/\s/g, ""))}`;
}
