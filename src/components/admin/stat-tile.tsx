import { Card, CardContent } from "@/components/ui/card";

/**
 * Pojedyncza liczba z podpisem.
 *
 * Podpis stoi nad liczbą, a nie pod nią: kafelki czyta się skanując wzrokiem
 * w dół kolumny, a wtedy najpierw trzeba wiedzieć, czego się patrzy.
 */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="r-display text-[22px] leading-none text-fg">{value}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
