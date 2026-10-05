import { z } from "zod";

import { MESSAGE_STATUS_FILTERS } from "@/lib/messages/status";

/** Okres, z którego pokazujemy wysyłki — w dniach; „all" to cała historia. */
export const MESSAGE_PERIODS = ["7", "30", "90", "all"] as const;
export type MessagePeriod = (typeof MESSAGE_PERIODS)[number];

export const messageListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(MESSAGE_STATUS_FILTERS).catch("all").default("all"),
  period: z.enum(MESSAGE_PERIODS).catch("all").default("all"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
});

export type MessageListQuery = z.output<typeof messageListQuerySchema>;
