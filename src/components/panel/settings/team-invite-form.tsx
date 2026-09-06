"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import {
  ASSIGNABLE_ROLES,
  inviteMemberSchema,
  membershipRoleHints,
  membershipRoleLabels,
  type InviteMemberInput,
  type InviteMemberOutput,
} from "@/lib/validations/team";

/**
 * Zaproszenie współpracownika.
 *
 * Wynik wysyłki maila pokazujemy osobno od wyniku zapisu, bo to dwie różne
 * rzeczy: zaproszenie może istnieć, choć wiadomość nie wyszła (brak
 * skonfigurowanej poczty). Zbicie tego w jedno „wysłano" kazałoby czekać na
 * maila, który nigdy nie przyjdzie.
 */
export function TeamInviteForm() {
  const { d } = useI18n();
  const t = d.panel.team.invite;
  const v = useValidationContext();
  const router = useRouter();

  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput, unknown, InviteMemberOutput>({
    resolver: zodResolver(inviteMemberSchema(v)),
    defaultValues: { email: "", role: "MEMBER" },
  });

  const roleLabels = membershipRoleLabels(d);
  const roleHints = membershipRoleHints(d);
  const selectedRole = watch("role");

  async function onSubmit() {
    setFormError(null);
    setNotice(null);

    const values = getValues();
    const result = await api.post<{ email: string; sent: boolean; sendError: string | null }>(
      "/api/team/invitations",
      values,
    );

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof InviteMemberInput, { message: messages[0] });
      }
      setFormError(result.message);
      return;
    }

    setNotice(
      result.data.sent
        ? { tone: "success", text: fill(t.sent, { email: result.data.email }) }
        : {
            tone: "warning",
            text: fill(t.notDelivered, { error: result.data.sendError ?? "" }),
          },
    );

    reset({ email: "", role: values.role });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">{t.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{t.lead}</p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="invite-email" label={t.email} error={errors.email?.message}>
              <Input
                {...fieldAria("invite-email", { error: errors.email?.message })}
                type="email"
                inputMode="email"
                autoComplete="off"
                disabled={isSubmitting}
                {...register("email")}
              />
            </FormField>

            <FormField
              id="invite-role"
              label={t.role}
              error={errors.role?.message}
              hint={roleHints[selectedRole as keyof typeof roleHints] ?? undefined}
            >
              <Select
                {...fieldAria("invite-role", { error: errors.role?.message })}
                disabled={isSubmitting}
                {...register("role")}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden />
              )}
              {isSubmitting ? t.submitting : t.submit}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
