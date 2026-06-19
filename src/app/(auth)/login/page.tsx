import { LoginForm } from "@/components/auth/login-form";
import { AuthBenefitPanel } from "@/components/premium/auth-benefit-panel";
import { PremiumCard } from "@/components/premium/premium-card";
import { redirectAuthenticatedUser } from "@/server/auth/session";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
      <div className="hidden lg:block">
        <AuthBenefitPanel />
      </div>

      <PremiumCard padding="lg" className="mx-auto w-full max-w-[460px]">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Вход</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Войти в workspace
          </h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Автор, ученик или админ. Используй тестовый аккаунт или свои
            данные.
          </p>
        </div>
        <div className="mt-8">
          <LoginForm />
        </div>
      </PremiumCard>
    </div>
  );
}
