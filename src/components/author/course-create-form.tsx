"use client";

import { startTransition, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slideUp } from "@/lib/motion";
import {
  courseCategoryOptions,
  courseCurrencyOptions,
  courseFormSchema,
  type CourseFormInput,
  type CourseFormValues,
  courseLanguageOptions,
  courseLevelOptions,
  slugifyCourseTitle,
} from "@/lib/validators/course";
import { createAuthorCourse } from "@/server/author/actions";

export function CourseCreateForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<CourseFormValues, undefined, CourseFormInput>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      category: "AI",
      price: 199,
      currency: "USD",
      coverUrl: "",
      level: "Intermediate",
      language: "Russian",
    },
  });

  const titleValue = form.watch("title");

  useEffect(() => {
    const slugState = form.getFieldState("slug");

    if (slugState.isDirty) {
      return;
    }

    form.setValue("slug", slugifyCourseTitle(titleValue), {
      shouldValidate: Boolean(titleValue),
    });
  }, [form, titleValue]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await createAuthorCourse(values);

      if (!result.success) {
        setServerError(result.message);

        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) {
            form.setError(field as keyof CourseFormValues, {
              message: messages[0],
            });
          }
        }

        setIsPending(false);
        return;
      }

      window.location.assign(
        `/author/courses/${result.data?.courseId}/studio/overview`,
      );
    });
  });

  return (
    <motion.form
      onSubmit={onSubmit}
      variants={slideUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="title">Название курса</Label>
          <Input
            id="title"
            placeholder="Системы AI-курсов"
            {...form.register("title")}
          />
          {form.formState.errors.title ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            placeholder="ai-course-systems"
            {...form.register("slug")}
          />
          {form.formState.errors.slug ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.slug.message}
            </p>
          ) : (
            <p className="text-xs text-black/42">
              Будет использоваться в ссылке курса.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverUrl">URL обложки</Label>
          <Input
            id="coverUrl"
            placeholder="https://..."
            {...form.register("coverUrl")}
          />
          {form.formState.errors.coverUrl ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.coverUrl.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            placeholder="Опиши, какой результат получит ученик и чем курс отличается."
            {...form.register("description")}
          />
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
                {{
                  AI: "AI",
                  Design: "Дизайн",
                  Marketing: "Маркетинг",
                  Business: "Бизнес",
                  "Creator Economy": "Creator Economy",
                }[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
          <div className="space-y-2">
            <Label htmlFor="price">Цена</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="1"
              {...form.register("price")}
            />
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
                {{
                  Beginner: "Начальный",
                  "Advanced Beginner": "Начальный плюс",
                  Intermediate: "Средний",
                  Advanced: "Продвинутый",
                }[option]}
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
                {{
                  English: "Английский",
                  Russian: "Русский",
                }[option]}
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

      <div className="flex flex-wrap gap-3">
        <PremiumButton type="submit" className="h-12 px-6" disabled={isPending}>
          {isPending ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Создаем курс...
            </>
          ) : (
            "Создать курс"
          )}
        </PremiumButton>
      </div>
    </motion.form>
  );
}
