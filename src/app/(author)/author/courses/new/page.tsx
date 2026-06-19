import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { CourseCreateForm } from "@/components/author/course-create-form";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";

export default function NewAuthorCoursePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: "Новый курс" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <PremiumCard padding="lg" className="rounded-[2.6rem] bg-white/92 backdrop-blur-xl">
          <Badge variant="primary">Course setup</Badge>
          <SectionHeader
            className="mt-5"
            eyebrow="Создание курса"
            title="Создай курс и сразу переходи в builder"
            description="Сначала заполняем основную карточку курса, после этого откроется builder для модулей и уроков."
          />

          <div className="mt-8">
            <CourseCreateForm />
          </div>
        </PremiumCard>

        <div className="space-y-4">
          <PremiumCard padding="lg" className="rounded-[2.2rem] border-transparent bg-black text-white">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
              <Plus className="size-5" />
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              Новый продукт
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Builder откроется сразу после создания и позволит руками собрать
              курс до уровня модулей и уроков.
            </p>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm text-black/46">Что дальше</p>
                <h3 className="text-xl font-semibold tracking-tight text-black">
                  После создания
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                "Добавишь модули",
                "Заполнишь уроки",
                "Переключишь курс в PUBLISHED",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4 text-sm font-medium text-black/62"
                >
                  {item}
                </div>
              ))}
            </div>

            <Link
              href="/author"
              className="mt-6 inline-flex text-sm font-medium text-black/56 transition duration-200 hover:text-black"
            >
              Назад к dashboard
            </Link>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
