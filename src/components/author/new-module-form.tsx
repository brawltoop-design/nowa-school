"use client";

import { startTransition, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  moduleFormSchema,
  type ModuleFormInput,
} from "@/lib/validators/course";
import { createAuthorModule } from "@/server/author/actions";

type NewModuleFormProps = {
  courseId: string;
};

export function NewModuleForm({ courseId }: NewModuleFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ModuleFormInput>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await createAuthorModule(courseId, values);

      if (!result.success) {
        setServerError(result.message);

        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) {
            form.setError(field as keyof ModuleFormInput, {
              message: messages[0],
            });
          }
        }

        setIsPending(false);
        return;
      }

      form.reset();
      setIsPending(false);
      router.refresh();
    });
  });

  return (
    <PremiumCard padding="lg" className="rounded-[2.4rem] bg-white/92 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
          <Plus className="size-5" />
        </div>
        <div>
          <p className="text-sm text-black/46">Новый модуль</p>
          <h3 className="text-2xl font-semibold tracking-tight text-black">
            Добавить модуль
          </h3>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="new-module-title">Название модуля</Label>
          <Input
            id="new-module-title"
            placeholder="Module title"
            {...form.register("title")}
          />
          {form.formState.errors.title ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-module-description">Описание</Label>
          <Textarea
            id="new-module-description"
            placeholder="Коротко опиши, чему посвящен модуль."
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <p className="text-sm text-red-500">
              {form.formState.errors.description.message}
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

        <PremiumButton type="submit" className="h-12 px-6" disabled={isPending}>
          {isPending ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Добавляем...
            </>
          ) : (
            "Добавить модуль"
          )}
        </PremiumButton>
      </form>
    </PremiumCard>
  );
}
