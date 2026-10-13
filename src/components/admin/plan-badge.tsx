import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { SubscriptionPlan } from "@/generated/prisma/enums";
import { PLAN_LABELS } from "@/lib/validations/admin";

/** Plakietka planu w tym samym kolorze na każdym ekranie administratora. */
const PLAN_TONE: Record<SubscriptionPlan, BadgeProps["tone"]> = {
  FREE: "neutral",
  START: "info",
  PRO: "good",
  PORTFOLIO: "amber",
};

export function PlanBadge({ plan, size = "sm" }: { plan: SubscriptionPlan; size?: BadgeProps["size"] }) {
  return (
    <Badge tone={PLAN_TONE[plan]} size={size}>
      {PLAN_LABELS[plan]}
    </Badge>
  );
}
