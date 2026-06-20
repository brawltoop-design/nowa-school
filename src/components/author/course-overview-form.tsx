"use client";

import { startTransition, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  courseCategoryOptions,
  courseCurrencyOptions,
  courseLanguageOptions,
  courseLevelOptions,
  courseOverviewSchema,
  type CourseOverviewInput,
  type CourseOverviewValues,
} from "@/lib/validators/course";
import { updateAuthorCourseOverview } from "@/server/author/actions";
import type { AuthorBuilderCourse } from "@/server/author/queries";

type CourseOverviewFormProps = {
  course: AuthorBuilderCourse;
};

const courseLevelLabels = {
  Beginner: "Начальный",
  "Advanced Beginner": "Начальный плюс",
  Intermediate: "Средний",
  Advanced: "Продвинутый",
} as const;

const courseLanguageLabels = {
  English: "Английский",
  Russian: "Русский",
} as const;

const courseCategoryLabels = {
  AI: "AI",
  Design: "Дизайн",
  Marketing: "Маркетинг",
  Business: "Бизнес",
  "Creator Economy": "Creator Economy",
} as const;

export function CourseOverviewForm({ course }: CourseOverviewFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<CourseOverviewValues, undefined, CourseOverviewInput>({
    resolver: zodResolver(courseOverviewSchema),
    defaultValues: {
      title: course.title,
      slug: course.slug,
      description: course.description,
      category: course.category as CourseOverviewInput["category"],
      price: course.price,
      currency: course.currency as CourseOverviewInput["currency"],
      coverUrl: course.coverUrl ?? "",
      level: course.level as CourseOverviewInput["level"],
      language: course.language as CourseOverviewInput["language"],
      status:
        course.status === "PUBLISHED"
          ? "PUBLISHED"
          : "DRAFT",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await updateAuthorCourseOverview(course.id, values);

      if (!result.success) {
        setServerError(result.message);

        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) {
            form.setError(field as keyof CourseOverviewValues, {
              message: messages[0],
            });
          }
        }

        setIsPending(false);
        return;
      }

      setSuccessMessage(result.message);
      setIsPending(false);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="title">Название курса</Label>
          <Input id="title" {...form.register("title")} />
          {form.formState.errors.title ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...form.register("slug")} />
          {form.formState.errors.slug ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.slug.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Статус</Label>
          <select
            id="status"
            {...form.register("status")}
            className="flex h-12 w-full rounded-2xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-sm text-foreground outline-none transition duration-200 focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/5"
          >
            <option value="DRAFT">Черновик</option>
            <option value="PUBLISHED">Опубликован</option>
          </select>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea id="description" {...form.register("description")} />
          {form.formState.errors.description ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.description.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Категория</Label>
          <select
            id="category"
            {...form.register("category")}
            className="flex h-12 w-full rounded-2xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-sm text-foreground outline-none transition duration-200 focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/5"
          >
            {courseCategoryOptions.map((option) => (
              <option key={option} value={option}>
                {courseCategoryLabels[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverUrl">URL обложки</Label>
          <Input id="coverUrl" {...form.register("coverUrl")} />
          {form.formState.errors.coverUrl ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.coverUrl.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
          <div className="space-y-2">
            <Label htmlFor="price">Цена</Label>
            <Input id="price" type="number" min="0" step="1" {...form.register("price")} />
            {form.formState.errors.price ? (
              <p className="text-sm text-red-500">
                {form.formState.errors.price.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Валюта</Label>
            <select
              id="currency"
              {...form.register("currency")}
              className="flex h-12 w-full rounded-2xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-sm text-foreground outline-none transition duration-200 focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/5"
            >
              {courseCurrencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="level">Уровень</Label>
          <select
            id="level"
            {...form.register("level")}
            className="flex h-12 w-full rounded-2xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-sm text-foreground outline-none transition duration-200 focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/5"
          >
            {courseLevelOptions.map((option) => (
              <option key={option} value={option}>
                {courseLevelLabels[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Язык</Label>
          <select
            id="language"
            {...form.register("language")}
            className="flex h-12 w-full rounded-2xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-sm text-foreground outline-none transition duration-200 focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/5"
          >
            {courseLanguageOptions.map((option) => (
              <option key={option} value={option}>
                {courseLanguageLabels[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {serverError ? (
        <PremiumCard
          padding="sm"
          className="rounded-2xl border-red-200 bg-red-50 text-red-600"
        >
          <p className="text-sm">{serverError}</p>
        </PremiumCard>
      ) : null}

      {successMessage ? (
        <PremiumCard
          padding="sm"
          className="rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700"
        >
          <p className="text-sm">{successMessage}</p>
        </PremiumCard>
      ) : null}

      <PremiumButton type="submit" className="h-12 px-6" disabled={isPending}>
        {isPending ? (
          <>
            <LoaderCircle className="mr-2 size-4 animate-spin" />
            Сохраняем...
          </>
        ) : (
          "Сохранить курс"
        )}
      </PremiumButton>
    </form>
  );
}
