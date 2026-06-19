import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";

export default function ForbiddenPage() {
  return (
    <section className="app-shell page-section">
      <div className="mx-auto max-w-3xl">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.5rem] border-black/5 bg-white"
        >
          <div className="space-y-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#efefff] text-[#3d3bff]">
              <ShieldAlert className="size-7" />
            </div>

            <div className="space-y-4">
              <Badge variant="subtle">403</Badge>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Этот раздел закрыт для вашей роли
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                Войдите под другим аккаунтом или вернитесь в публичную часть
                платформы.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <PremiumButton asChild>
                <Link href="/courses">На главную</Link>
              </PremiumButton>
              <PremiumButton asChild tone="secondary">
                <Link href="/login">Сменить аккаунт</Link>
              </PremiumButton>
            </div>
          </div>
        </PremiumCard>
      </div>
    </section>
  );
}
