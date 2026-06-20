"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { PremiumCard } from "@/components/premium/premium-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumButton } from "@/components/premium/premium-button";
import { slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { registerUser } from "@/server/auth/actions";

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "author",
      password: "",
    },
  });

  const selectedRole = form.watch("role");

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await registerUser(values);

      if (!result.success) {
        setServerError(result.message);

        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) {
            form.setError(field as keyof RegisterInput, {
              message: messages[0],
            });
          }
        }

        setIsPending(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: values.role === "author" ? "/author" : "/learn",
      });

      if (signInResult?.error) {
        setServerError("Аккаунт создан, но вход не выполнился.");
        setIsPending(false);
        return;
      }

      window.location.assign(
        values.role === "author" ? "/author" : "/learn",
      );
    });
  });

  return (
    <motion.form
      onSubmit={onSubmit}
      className="space-y-5"
      variants={slideUp}
      initial="hidden"
      animate="visible"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Имя</Label>
        <Input
          id="name"
          placeholder="Ника Петрова"
          autoComplete="name"
          {...form.register("name")}
        />
        {form.formState.errors.name ? (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Почта</Label>
        <Input
          id="email"
          type="email"
          placeholder="author@newschool.ai"
          autoComplete="email"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Роль</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "student" as const,
              title: "Ученик",
              description: "Учиться внутри платформы",
            },
            {
              value: "author" as const,
              title: "Автор",
              description: "Создавать и продавать курсы",
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                form.setValue("role", option.value, {
                  shouldValidate: true,
                });
              }}
              className={cn(
                "rounded-[1.5rem] border px-4 py-4 text-left transition duration-200",
                selectedRole === option.value
                  ? "border-[#3d3bff] bg-[#efefff]"
                  : "border-black/10 bg-[#f6f6f6] hover:bg-white",
              )}
            >
              <p className="text-sm font-semibold text-foreground">
                {option.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {option.description}
              </p>
            </button>
          ))}
        </div>
        {form.formState.errors.role ? (
          <p className="text-sm text-red-500">{form.formState.errors.role.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          placeholder="Минимум 8 символов"
          autoComplete="new-password"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-red-500">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <PremiumCard
          padding="sm"
          className="rounded-2xl border-red-200 bg-red-50 text-red-600"
        >
          <p className="text-sm">{serverError}</p>
        </PremiumCard>
      ) : null}

      <PremiumButton type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <LoaderCircle className="mr-2 size-4 animate-spin" />
            Создаем...
          </>
        ) : (
          "Создать проект"
        )}
      </PremiumButton>

      <p className="text-center text-sm text-muted-foreground">
        Уже есть доступ?{" "}
        <Link href="/login" className="font-semibold text-foreground">
          Войти
        </Link>
      </p>
    </motion.form>
  );
}
