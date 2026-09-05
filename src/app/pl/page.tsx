import type { Metadata } from "next";

import { Landing } from "@/components/marketing/landing";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary("pl").marketing;

export const metadata: Metadata = {
  // `absolute`, bo tytuł strony głównej sam zaczyna się od nazwy marki —
  // szablon „%s · Rentix" z layoutu dokleiłby ją po raz drugi.
  title: { absolute: t.metaTitle },
  description: t.metaDescription,
  /*
    `hreflang` między wersjami krajowymi. Wskazujemy tylko strony główne, bo
    tylko one mają w drugim kraju odpowiednik jeden do jednego — podstrony mają
    własne slugi. `x-default` to wersja polska: rynek, na którym Rentix stoi.
  */
  alternates: {
    canonical: "/pl",
    languages: {
      "pl-PL": "/pl",
      "en-GB": "/uk",
      "x-default": "/pl",
    },
  },
};

export default function HomePage() {
  return <Landing locale="pl" />;
}
