import type { MetadataRoute } from "next";

import { ROUTES } from "@/lib/auth/routes";

/**
 * Manifest aplikacji webowej — to on decyduje, że skrót z ekranu głównego
 * otwiera się jako osobna aplikacja, bez paska adresu i dolnego paska Safari.
 *
 * Same znaczniki `apple-mobile-web-app-capable` z `layout.tsx` już nie
 * wystarczają: Safari od iOS 17.4 czyta manifest i to jego `display` wygrywa.
 * Zostawiamy tamte znaczniki dla starszych iPhone'ów, ale rozstrzyga ten plik.
 *
 * Uwaga przy testowaniu: iOS zapamiętuje ustawienia w chwili dodawania skrótu.
 * Po wdrożeniu zmiany trzeba usunąć starą ikonę z ekranu głównego i dodać ją
 * jeszcze raz — odświeżenie strony nic nie zmieni.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rentix",
    short_name: "Rentix",
    description: "Zarządzanie najmem: nieruchomości, najemcy, umowy i płatności.",
    /*
      Aplikacja startuje w panelu, a nie na stronie ofertowej — skrót ma być
      wejściem do narzędzia. Niezalogowanego middleware odeśle na logowanie,
      a najemcę na jego uproszczony panel.
    */
    start_url: ROUTES.ownerDashboard,
    // Cała domena w zasięgu aplikacji: wyjście na stronę publiczną (regulamin,
    // wylogowanie) ma zostać w oknie aplikacji, nie otwierać Safari.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Tło splash screena na iOS i tło okna zanim strona się namaluje.
    background_color: "#FBF7EF",
    theme_color: "#FBF7EF",
    lang: "pl",
    dir: "ltr",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android przycina ikonę do kształtu systemowego — ten wariant ma literę
      // w bezpiecznym środku, żeby nie ścięło jej brzegów.
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
