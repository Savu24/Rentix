import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/lib/i18n";

/*
  Ulepszenie planu bez prawdziwego Stripe: sesja, baza i klient Stripe są
  udawane, a sprawdzamy, co endpoint wysyła do Stripe i co odpowiada.
*/

const d = getDictionary("pl");

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { subscription: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));
vi.mock("@/lib/env", () => ({ env: {} }));

const membershipRole = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireApiOwner: async () => ({
    session: { user: { id: "user_1" } },
    organizationId: "org_1",
    locale: "pl",
    d,
  }),
  membershipRole: (...a: unknown[]) => membershipRole(...a),
}));

const update = vi.fn();
const retrieve = vi.fn();
const fakeStripe = { subscriptions: { update, retrieve } };
const syncStripeSubscription = vi.fn();

vi.mock("@/lib/billing/stripe", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/billing/stripe")>();
  return {
    ...original,
    stripeClient: () => fakeStripe,
    priceByLookupKey: async (_stripe: unknown, key: string) => ({ id: `price_${key}` }),
    syncStripeSubscription: (...a: unknown[]) => syncStripeSubscription(...a),
  };
});

const { POST } = await import("../route");

function request(body: unknown) {
  return new Request("http://localhost/api/billing/upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

/** Subskrypcja z dwiema pozycjami: plan i opłata od czynszu (kolejność celowo odwrotna). */
const SUBSCRIPTION = {
  id: "sub_1",
  items: {
    data: [
      { id: "si_fee", price: { lookup_key: "rent_fee_monthly" } },
      { id: "si_plan", price: { lookup_key: "start_monthly" } },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  membershipRole.mockResolvedValue("OWNER");
  findUnique.mockResolvedValue({ externalSubscriptionId: "sub_1", status: "ACTIVE", plan: "START" });
  retrieve.mockResolvedValue(SUBSCRIPTION);
  update.mockResolvedValue({});
});

describe("POST /api/billing/upgrade", () => {
  it("podmienia cenę pozycji planu, nie ruszając opłaty od czynszu", async () => {
    const response = await POST(request({ plan: "PRO" }));

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith("sub_1", {
      items: [{ id: "si_plan", price: "price_pro_monthly" }],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
    });
    // Plan w bazie od razu, bez czekania na webhook.
    expect(syncStripeSubscription).toHaveBeenCalledWith(fakeStripe, "sub_1");
  });

  it("nie pozwala zejść na niższy ani ten sam plan", async () => {
    findUnique.mockResolvedValue({ externalSubscriptionId: "sub_1", status: "ACTIVE", plan: "PRO" });

    for (const plan of ["START", "PRO"]) {
      const response = await POST(request({ plan }));
      expect(response.status).toBe(409);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("odmawia kontu bez opłaconej subskrypcji", async () => {
    findUnique.mockResolvedValue({ externalSubscriptionId: null, status: "ACTIVE", plan: "FREE" });

    const response = await POST(request({ plan: "PRO" }));

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("odmawia współpracownikowi bez roli właściciela albo administratora", async () => {
    membershipRole.mockResolvedValue("MEMBER");

    const response = await POST(request({ plan: "PRO" }));

    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("gdy karta nie przejdzie, plan zostaje i klient dostaje czytelny komunikat", async () => {
    update.mockRejectedValue(new Error("card_declined"));

    const response = await POST(request({ plan: "PORTFOLIO" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.message).toBe(d.panel.settings.plan.billing.upgradeFailed);
    expect(syncStripeSubscription).not.toHaveBeenCalled();
  });

  it("gdy Stripe nie odpowiada przy odczycie, zwraca komunikat, a nie błąd serwera bez treści", async () => {
    retrieve.mockRejectedValue(new Error("network"));

    const response = await POST(request({ plan: "PRO" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.message).toBe(d.panel.settings.plan.billing.unavailable);
    expect(update).not.toHaveBeenCalled();
  });
});
