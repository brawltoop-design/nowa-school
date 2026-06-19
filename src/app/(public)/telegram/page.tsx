import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileStack, MessageCircle, Sparkles } from "lucide-react";
import { LeadCaptureForm } from "@/components/premium/lead-capture-form";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Платный Telegram nowa school",
  description:
    "Закрытый Telegram с prompts, файлами, разборами, обновлениями AI-инструментов и практическими сценариями.",
};

const schedule = [
  "Понедельник: prompts и короткий AI-сценарий",
  "Среда: разбор проекта или ошибки",
  "Пятница: файлы недели и tool stack",
  "Воскресенье: roadmap на следующий спринт",
];

const files = [
  "prompt packs",
  "шаблоны лендингов",
  "Notion-таблицы",
  "starter repositories",
  "чеклисты запуска",
  "разборы AI-агентов",
];

const tariffs = [
  {
    title: "Library",
    price: "990 ₽/мес",
    text: "Доступ к файлам, prompts и еженедельным обновлениям.",
  },
  {
    title: "Builder",
    price: "1990 ₽/мес",
    text: "Библиотека, разборы, приоритетные вопросы и рабочие спринты.",
  },
];

export default function TelegramPage() {
  return (
    <div className="page-section">
      <div className="app-shell space-y-10">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <Badge variant="primary">Telegram Club</Badge>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl">
              Закрытый канал для тех, кто собирает AI-продукты регулярно
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-black/62">
              Prompts, файлы, разборы, обновления инструментов и практические
              сценарии без обещаний легкого результата. Ты получаешь рабочую
              среду, где проще не бросить после первого интереса.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <PremiumButton asChild className="h-12 px-6">
                <Link href="/pricing">Смотреть тарифы</Link>
              </PremiumButton>
              <PremiumButton asChild tone="secondary" className="h-12 px-6">
                <Link href="/free">Сначала starter kit</Link>
              </PremiumButton>
            </div>
          </div>

          <PremiumCard padding="lg" className="rounded-[2.4rem] bg-black text-white">
            <MessageCircle className="size-6 text-white/72" />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              Что внутри Telegram
            </h2>
            <div className="mt-6 grid gap-3">
              {files.slice(0, 4).map((item) => (
                <div
                  key={item}
                  className="rounded-[1.3rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/78"
                >
                  {item}
                </div>
              ))}
            </div>
          </PremiumCard>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
            <SectionHeader
              eyebrow="Расписание"
              title="Обновления каждую неделю"
              description="Клуб держит ритм, но не превращается в шумный чат без структуры."
            />
            <div className="mt-6 grid gap-3">
              {schedule.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[1.4rem] bg-[#f7f8fb] px-4 py-4 text-sm text-black/62"
                >
                  <CalendarDays className="size-4 text-[#3d3bff]" />
                  {item}
                </div>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
            <SectionHeader
              eyebrow="Файлы"
              title="Примеры материалов"
              description="Не бонусы ради громкости, а артефакты, которые можно использовать."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {files.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] border border-black/8 bg-[#fafafa] px-4 py-4 text-sm font-medium text-black/64"
                >
                  <FileStack className="mb-3 size-4 text-[#3d3bff]" />
                  {item}
                </div>
              ))}
            </div>
          </PremiumCard>
        </section>

        <section>
          <SectionHeader
            eyebrow="Тарифы"
            title="Можно начать без большого платежа"
            description="Подписка снижает price shock и дает регулярный доступ к материалам."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {tariffs.map((tariff) => (
              <PremiumCard key={tariff.title} padding="lg" className="rounded-[2.3rem]">
                <Badge variant="subtle">{tariff.title}</Badge>
                <p className="mt-5 text-4xl font-semibold tracking-tight text-black">
                  {tariff.price}
                </p>
                <p className="mt-4 text-sm leading-7 text-black/56">{tariff.text}</p>
                <PremiumButton className="mt-6 h-12 px-6">Выбрать</PremiumButton>
              </PremiumCard>
            ))}
          </div>
        </section>

        <PremiumCard padding="lg" className="rounded-[2.5rem] bg-[#f6f7fb]">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Sparkles className="size-5 text-[#3d3bff]" />
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-black">
                Хочешь сначала посмотреть стиль материалов?
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/56">
                Оставь email или Telegram и получи starter kit до входа в клуб.
              </p>
            </div>
            <LeadCaptureForm compact buttonLabel="Получить пример" />
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
