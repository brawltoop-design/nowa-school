import { RegisterForm } from "@/components/auth/register-form";
import { AuthBenefitPanel } from "@/components/premium/auth-benefit-panel";
import { PremiumCard } from "@/components/premium/premium-card";
import { redirectAuthenticatedUser } from "@/server/auth/session";

export default async function RegisterPage() {
  await redirectAuthenticatedUser();

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
      <div className="hidden lg:block">
        <AuthBenefitPanel />
      </div>

      <PremiumCard padding="lg" className="mx-auto w-full max-w-[460px]">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Регистрация</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Открыть проект
          </h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Создай новый workspace и продолжай собирать школу на этой базе.
          </p>
        </div>
        <div className="mt-8">
          <RegisterForm />
        </div>
      </PremiumCard>
    </div>
  );
}
