import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { PremiumCard } from "@/components/premium/premium-card";

const benefits = [
  "Белая база в стиле новой главной",
  "Авторский кабинет, каталог и ученический кабинет",
  "Готовый MVP-скелет под ручную доработку",
];

export function AuthBenefitPanel() {
  return (
    <PremiumCard padding="lg" className="h-full border-transparent bg-black text-white">
      <Image
        src="/nowa-school-white-logo.png"
        alt="nowa school"
        width={3470}
        height={1076}
        className="h-10 w-auto"
        priority
      />
      <div className="mt-8 space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight">
          Открой workspace и собирай продукт дальше по блокам.
        </h2>
        <p className="text-sm leading-7 text-white/64">
          Вход и регистрация теперь говорят на том же визуальном языке, что и
          главная страница.
        </p>
      </div>
      <div className="mt-8 space-y-4">
        {benefits.map((benefit) => (
          <div key={benefit} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-white" />
            <p className="text-sm leading-7 text-white/72">{benefit}</p>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
