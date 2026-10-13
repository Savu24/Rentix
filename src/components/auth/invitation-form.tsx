"use client";

import { Check, Loader2, Lock } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordChecklist } from "@/components/ui/password-checklist";
import { PasswordInput } from "@/components/ui/password-input";
import { useI18n } from "@/lib/i18n/client";
import {
  EMPTY_INVITATION_STATE,
  type InvitationFormState,
} from "@/lib/invitations/form-state";

/**
 * Formularz zakładania konta z zaproszenia.
 *
 * `useActionState` zamiast `fetch` i klienta API: konto trzeba założyć
 * i zalogować w jednym żądaniu, a ciasteczko sesji ustawia tylko Server Action
 * (patrz `actions.ts`). Dzięki temu formularz działa też bez JavaScriptu —
 * wysyła się jak zwykły `<form>`.
 */
export function InvitationCreateAccountForm({
  action,
  email,
}: {
  action: (state: InvitationFormState, formData: FormData) => Promise<InvitationFormState>;
  /** Adres z zaproszenia — tylko do odczytu, konto powstaje właśnie na niego. */
  email: string;
}) {
  const { d } = useI18n();
  const t = d.auth.invitation.create;
  const [state, formAction, pending] = useActionState(action, EMPTY_INVITATION_STATE);
  // Tylko do listy wymagań pod polem — formularz i tak wysyła się natywnie.
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <FormField id="invitation-email" label={d.auth.invitation.email}>
        <div className="relative">
          <Input id="invitation-email" value={email} readOnly disabled className="pr-10" />
          <Lock
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
        </div>
      </FormField>

      <FormField id="invitation-name" label={t.name} error={state.fields.name?.[0]}>
        <Input
          {...fieldAria("invitation-name", { error: state.fields.name?.[0] })}
          name="name"
          autoComplete="name"
          disabled={pending}
        />
      </FormField>

      <div className="flex flex-col gap-2.5">
        <FormField id="invitation-password" label={t.password} error={state.fields.password?.[0]}>
          <PasswordInput
            {...fieldAria("invitation-password", { error: state.fields.password?.[0] })}
            aria-describedby={state.fields.password?.[0] ? "invitation-password-error" : "invitation-password-rules"}
            name="password"
            autoComplete="new-password"
            disabled={pending}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>
        <PasswordChecklist id="invitation-password-rules" value={password} />
      </div>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

/** Przyjęcie zaproszenia przez zalogowanego — jeden przycisk i ukryty token. */
export function InvitationAcceptButton({
  action,
  token,
}: {
  action: (state: InvitationFormState, formData: FormData) => Promise<InvitationFormState>;
  token: string;
}) {
  const { d } = useI18n();
  const t = d.auth.invitation.ready;
  const [state, formAction, pending] = useActionState(action, EMPTY_INVITATION_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? (
          <Loader2 className="size-[18px] animate-spin" aria-hidden />
        ) : (
          <Check className="size-[18px]" aria-hidden />
        )}
        {pending ? t.accepting : t.accept}
      </Button>
    </form>
  );
}
