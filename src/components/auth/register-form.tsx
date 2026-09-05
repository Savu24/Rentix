"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/auth/routes";
import { useI18n } from "@/lib/i18n/client";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

type ApiErrorBody = {
  error?: { code?: string; message?: string; fields?: Record<string, string[]> };
};

export function RegisterForm() {
  const router = useRouter();
  const { locale, d } = useI18n();
  const t = d.auth.register;

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema(d.auth.validation)),
    defaultValues: { name: "", organizationName: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      /*
        Kraj idzie w treści żądania, a nie tylko w ciasteczku. To ta wersja,
        którą użytkownik naprawdę miał przed sobą, gdy zakładał konto — i to
        ona rozstrzyga o języku panelu oraz o rodzaju dokumentów, więc nie może
        zależeć od ciasteczka, które mógł zdążyć przestawić w drugiej karcie.
      */
      body: JSON.stringify({ ...values, locale }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

      // Serwer zwraca błędy per pole — przypinamy je do konkretnych inputów,
      // żeby użytkownik nie musiał zgadywać, co poprawić.
      const fields = body.error?.fields;
      if (fields) {
        for (const [field, messages] of Object.entries(fields)) {
          if (field in values && messages[0]) {
            setError(field as keyof RegisterInput, { message: messages[0] });
          }
        }
      }

      setFormError(body.error?.message ?? t.failed);
      return;
    }

    // Konto istnieje — logujemy od razu, żeby użytkownik nie wpisywał hasła dwa razy.
    const signInResult = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (!signInResult || signInResult.error) {
      // Rzadki przypadek: konto powstało, ale logowanie się nie udało.
      // Odsyłamy na logowanie zamiast zostawiać użytkownika w zawieszeniu.
      router.replace(ROUTES.loginAlias);
      return;
    }

    router.replace(ROUTES.ownerDashboard);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <FormField id="name" label={t.name} error={errors.name?.message}>
        <Input
          {...fieldAria("name", { error: errors.name?.message })}
          autoComplete="name"
          disabled={isSubmitting}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="organizationName"
        label={t.organizationName}
        error={errors.organizationName?.message}
        hint={t.organizationHint}
      >
        <Input
          {...fieldAria("organizationName", { error: errors.organizationName?.message })}
          autoComplete="organization"
          disabled={isSubmitting}
          {...register("organizationName")}
        />
      </FormField>

      <FormField id="email" label={t.email} error={errors.email?.message}>
        <Input
          {...fieldAria("email", { error: errors.email?.message })}
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          {...register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label={t.password}
        error={errors.password?.message}
        hint={t.passwordHint}
      >
        <Input
          {...fieldAria("password", {
            error: errors.password?.message,
            hint: t.passwordHint,
          })}
          type="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          {...register("password")}
        />
      </FormField>

      <Button type="submit" size="lg" block disabled={isSubmitting} className="mt-1">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t.submitting}
          </>
        ) : (
          t.submit
        )}
      </Button>
    </form>
  );
}
