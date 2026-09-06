"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
}: {
  action: (state: InvitationFormState, formData: FormData) => Promise<InvitationFormState>;
}) {
  const { d } = useI18n();
  const t = d.auth.invitation.create;
  const [state, formAction, pending] = useActionState(action, EMPTY_INVITATION_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <FormField id="invitation-name" label={t.name} error={state.fields.name?.[0]}>
        <Input
          {...fieldAria("invitation-name", { error: state.fields.name?.[0] })}
          name="name"
          autoComplete="name"
          disabled={pending}
        />
      </FormField>

      <FormField
        id="invitation-password"
        label={t.password}
        hint={t.passwordHint}
        error={state.fields.password?.[0]}
      >
        <Input
          {...fieldAria("invitation-password", { error: state.fields.password?.[0] })}
          name="password"
          type="password"
          autoComplete="new-password"
          disabled={pending}
        />
      </FormField>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
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

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {pending ? t.accepting : t.accept}
      </Button>
    </form>
  );
}
