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
import { loginErrorMessage } from "@/lib/auth/errors";
import { ROUTES } from "@/lib/auth/routes";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm({
  returnTo,
  initialErrorCode,
}: {
  returnTo?: string;
  initialErrorCode?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(
    initialErrorCode ? loginErrorMessage(initialErrorCode) : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    // `redirect: false` — chcemy pokazać błąd w formularzu zamiast przeładowania
    // strony z parametrem `?error=` w adresie.
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (!result || result.error) {
      setFormError(loginErrorMessage(result?.code ?? result?.error));
      return;
    }

    // Middleware odeśle najemcę na /najemca, jeśli trafił tu z panelu właściciela.
    router.replace(returnTo ?? ROUTES.ownerDashboard);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <FormField id="email" label="Adres e-mail" error={errors.email?.message}>
        <Input
          {...fieldAria("email", { error: errors.email?.message })}
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          {...register("email")}
        />
      </FormField>

      <FormField id="password" label="Hasło" error={errors.password?.message}>
        <Input
          {...fieldAria("password", { error: errors.password?.message })}
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          {...register("password")}
        />
      </FormField>

      <Button type="submit" size="lg" block disabled={isSubmitting} className="mt-1">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Logowanie…
          </>
        ) : (
          "Zaloguj się"
        )}
      </Button>
    </form>
  );
}
