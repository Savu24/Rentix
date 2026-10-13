import { CheckCircle2, DoorOpen, Hammer } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { fill } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/types";
import { resolvePropertyOccupancy, type OccupancyInput } from "@/lib/properties/occupancy";

type BadgeLabels = Dictionary["panel"]["propertiesPage"]["badge"];

/**
 * Plakietka obłożenia nieruchomości — kolor, ikona i krótka etykieta,
 * identyczne na liście nieruchomości i na pulpicie
 * (redesign/_generator/lib.mjs, `STATUS`: let, vacant, refurb, allLet).
 */
export function OccupancyBadge({
  property,
  labels,
  size,
  className,
}: {
  property: OccupancyInput;
  labels: BadgeLabels;
  size?: BadgeProps["size"];
  className?: string;
}) {
  const occupancy = resolvePropertyOccupancy(property);

  const view: { tone: BadgeProps["tone"]; icon: BadgeProps["icon"]; label: string } = (() => {
    switch (occupancy.kind) {
      case "refurbishment":
        return { tone: "warning", icon: Hammer, label: labels.underRefurbishment };
      case "let":
        return { tone: "good", icon: CheckCircle2, label: labels.let };
      case "allLet":
        return { tone: "good", icon: CheckCircle2, label: labels.allLet };
      case "vacant":
        return { tone: "info", icon: DoorOpen, label: labels.vacant };
      case "someVacant":
        return {
          tone: "info",
          icon: DoorOpen,
          label: fill(labels.someVacant, {
            available: occupancy.available,
            total: occupancy.total,
          }),
        };
    }
  })();

  return (
    <Badge tone={view.tone} icon={view.icon} size={size} className={className}>
      {view.label}
    </Badge>
  );
}
