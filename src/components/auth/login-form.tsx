"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { getRoleHome } from "@/lib/auth";
import { slideUp } from "@/lib/motion";
import { PremiumCard } from "@/components/premium/premium-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumButton } from "@/components/premium/premium-button";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "author@example.com",
      password: "password123",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setIsPending(true);

    startTransition(async () => {
      const callbackUrl = searchParams.get("callbackUrl");
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: callbackUrl ?? "/courses",
      });

      if (result?.error) {
        setServerError("Почта или пароль не подошли.");
        setIsPending(false);
        return;
      }

      const session = await getSession();
      const destination =
        callbackUrl ||
        (session?.user?.role ? getRoleHome(session.user.role) : "/courses");

      window.location.assign(destination);
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
        <Label htmlFor="email">Почта</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="author@newschool.ai"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Введите пароль"
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
            Входим...
          </>
        ) : (
          "Войти"
        )}
      </PremiumButton>

      <p className="text-center text-sm text-muted-foreground">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-semibold text-foreground">
          Создать
        </Link>
      </p>
    </motion.form>
  );
}
