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
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

type ApiErrorBody = {
  error?: { code?: string; message?: string; fields?: Record<string, string[]> };
};

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", organizationName: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
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

      setFormError(
        body.error?.message ?? "Nie udało się założyć konta. Spróbuj ponownie za chwilę.",
      );
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
      router.replace(ROUTES.login);
      return;
    }

    router.replace(ROUTES.ownerDashboard);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <FormField id="name" label="Imię i nazwisko" error={errors.name?.message}>
        <Input
          {...fieldAria("name", { error: errors.name?.message })}
          autoComplete="name"
          placeholder="Aleksandra Kowal"
          disabled={isSubmitting}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="organizationName"
        label="Nazwa firmy lub konta"
        error={errors.organizationName?.message}
        hint="Widoczna na fakturach i na publicznej stronie ofert."
      >
        <Input
          {...fieldAria("organizationName", { error: errors.organizationName?.message })}
          autoComplete="organization"
          placeholder="Kowal Nieruchomości"
          disabled={isSubmitting}
          {...register("organizationName")}
        />
      </FormField>

      <FormField id="email" label="Adres e-mail" error={errors.email?.message}>
        <Input
          {...fieldAria("email", { error: errors.email?.message })}
          type="email"
          autoComplete="email"
          placeholder="jan@przyklad.pl"
          disabled={isSubmitting}
          {...register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label="Hasło"
        error={errors.password?.message}
        hint="Minimum 10 znaków, w tym wielka litera i cyfra."
      >
        <Input
          {...fieldAria("password", {
            error: errors.password?.message,
            hint: "Minimum 10 znaków, w tym wielka litera i cyfra.",
          })}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          disabled={isSubmitting}
          {...register("password")}
        />
      </FormField>

      <Button type="submit" size="lg" block disabled={isSubmitting} className="mt-1">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Zakładanie konta…
          </>
        ) : (
          "Załóż darmowe konto"
        )}
      </Button>
    </form>
  );
}
