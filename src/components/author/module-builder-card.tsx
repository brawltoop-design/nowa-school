"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileText,
  Film,
  FolderOpen,
  Link2,
  LoaderCircle,
  Mic,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { MockUploadDropzone } from "@/components/author/mock-upload-dropzone";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { ConfirmDialog } from "@/components/premium/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatUploadSize,
  type LessonMaterial,
} from "@/lib/lesson-materials";
import {
  lessonFormSchema,
  type LessonFormInput,
  type LessonFormValues,
  moduleFormSchema,
  type ModuleFormInput,
} from "@/lib/validators/course";
import {
  createAuthorLesson,
  deleteAuthorLesson,
  deleteAuthorModule,
  generateAuthorLessonAiContent,
  moveAuthorLesson,
  moveAuthorModule,
  updateAuthorLesson,
  updateAuthorModule,
} from "@/server/author/actions";
import type { AuthorBuilderModule } from "@/server/author/queries";

type ModuleBuilderCardProps = {
  module: AuthorBuilderModule;
  isFirst: boolean;
  isLast: boolean;
};

type LessonEditorProps = {
  lesson: AuthorBuilderModule["lessons"][number];
  isFirst: boolean;
  isLast: boolean;
};

function FeedbackMessage({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) {
  return (
    <PremiumCard
      padding="sm"
      className={
        tone === "error"
          ? "rounded-2xl border-red-200 bg-red-50 text-red-600"
          : "rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    >
      <p className="text-sm">{message}</p>
    </PremiumCard>
  );
}

function FloatingToast({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "warning" | "error";
}) {
  const palette =
    tone === "success"
      ? "border-emerald-200/90 bg-white text-emerald-700"
      : tone === "warning"
        ? "border-amber-200/90 bg-white text-amber-700"
        : "border-red-200/90 bg-white text-red-700";

  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "warning"
        ? AlertTriangle
        : X;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-[1.8rem] border bg-white/96 px-4 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
      <div className={`flex items-start gap-3 ${palette}`}>
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-current/10">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}

async function transcriptFileToText(file: File) {
  const text = await file.text();
  return text.trim();
}

function MaterialsPreview({
  title,
  items,
  emptyCopy,
  onRemove,
}: {
  title: string;
  items: LessonMaterial[];
  emptyCopy: string;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="rounded-[1.6rem] border border-black/6 bg-[#fbfbfd] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-black">{title}</p>
        <Badge variant="subtle">{items.length}</Badge>
      </div>

      {items.length ? (
        <div className="mt-4 space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-black/6 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-black">
                  {item.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/44">
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="size-3.5" />
                    {item.url}
                  </span>
                  {formatUploadSize(item.size) ? (
                    <span>{formatUploadSize(item.size)}</span>
                  ) : null}
                </div>
              </div>

              {onRemove ? (
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-black/8 bg-white text-black/54 transition duration-200 hover:border-black/16 hover:text-black"
                  onClick={() => onRemove(item.id)}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-black/46">{emptyCopy}</p>
      )}
    </div>
  );
}

function LessonEditor({ lesson, isFirst, isLast }: LessonEditorProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [isMoving, setIsMoving] = useState<null | "up" | "down">(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "warning" | "error";
  } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<LessonFormValues, undefined, LessonFormInput>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl ?? "",
      contentText: lesson.contentText,
      transcript: lesson.transcript ?? "",
      materials: lesson.materials,
      durationMinutes: lesson.durationMinutes,
    },
  });

  const materials = form.watch("materials") ?? [];
  const videoUrl = form.watch("videoUrl");
  const transcriptUploads = materials.filter(
    (material) => material.kind === "transcript",
  );
  const resourceUploads = materials.filter(
    (material) => material.kind === "resource",
  );
  const videoUploadLabel = videoUrl
    ? videoUrl.split("/").filter(Boolean).at(-1) ?? videoUrl
    : null;

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (
    message: string,
    tone: "success" | "warning" | "error",
  ) => {
    setToast({ message, tone });

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3600);
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    startTransition(async () => {
      const result = await updateAuthorLesson(lesson.id, values);

      if (!result.success) {
        setServerError(result.message);
        setIsSaving(false);
        return;
      }

      setSuccessMessage(result.message);
      setIsSaving(false);
      router.refresh();
    });
  });

  const handleGenerateAi = () => {
    setServerError(null);
    setSuccessMessage(null);
    setIsGeneratingAi(true);

    startTransition(async () => {
      const result = await generateAuthorLessonAiContent(lesson.id);

      if (!result.success) {
        setServerError(result.message);
        setIsGeneratingAi(false);
        return;
      }

      setSuccessMessage(result.message);
      setIsGeneratingAi(false);
      router.refresh();
    });
  };

  const handleGenerateTranscript = () => {
    const currentVideoUrl = form.getValues("videoUrl")?.trim();

    if (!currentVideoUrl) {
      setServerError("Сначала добавь video URL или mock upload видео.");
      showToast("Сначала добавь video URL.", "error");
      return;
    }

    setServerError(null);
    setSuccessMessage(null);
    setIsGeneratingTranscript(true);

    startTransition(async () => {
      try {
        const response = await fetch("/api/transcription/lesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            fileUrl: currentVideoUrl,
          }),
        });

        const payload = (await response.json()) as {
          transcript?: string;
          durationMinutes?: number;
          provider?: string;
          warning?: string | null;
          message?: string;
        };

        if (!response.ok || !payload.transcript) {
          const message =
            payload.message ?? "Не удалось сгенерировать transcript.";
          setServerError(message);
          showToast(message, "error");
          setIsGeneratingTranscript(false);
          return;
        }

        form.setValue("transcript", payload.transcript, {
          shouldValidate: true,
        });

        if (typeof payload.durationMinutes === "number") {
          form.setValue("durationMinutes", payload.durationMinutes, {
            shouldValidate: true,
          });
        }

        const message =
          payload.provider === "mock"
            ? payload.warning ?? "Demo transcript generated."
            : "Transcript generated and saved.";

        setSuccessMessage(message);
        showToast(
          payload.provider === "mock" ? "Demo transcript generated." : message,
          payload.provider === "mock" ? "warning" : "success",
        );
      } catch {
        const message = "Не удалось обратиться к transcription API.";
        setServerError(message);
        showToast(message, "error");
      } finally {
        setIsGeneratingTranscript(false);
      }
    });
  };

  const handleMove = (direction: "up" | "down") => {
    setServerError(null);
    setSuccessMessage(null);
    setIsMoving(direction);

    startTransition(async () => {
      const result = await moveAuthorLesson(lesson.id, direction);

      if (!result.success) {
        setServerError(result.message);
        setIsMoving(null);
        return;
      }

      setIsMoving(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    setServerError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    startTransition(async () => {
      const result = await deleteAuthorLesson(lesson.id);

      if (!result.success) {
        setServerError(result.message);
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      router.refresh();
    });
  };

  return (
    <div className="rounded-[1.8rem] border border-black/6 bg-[#fbfbfc] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="subtle">Урок {lesson.order}</Badge>
            <span className="text-sm text-black/42">{lesson.durationMinutes} мин</span>
            {lesson.aiSummary ? <Badge variant="primary">AI-ready</Badge> : null}
          </div>
          <h4 className="mt-3 text-xl font-semibold tracking-tight text-black">
            {lesson.title}
          </h4>
        </div>

        <div className="flex flex-wrap gap-2">
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-10 px-4"
            disabled={isFirst || Boolean(isMoving)}
            onClick={() => handleMove("up")}
          >
            {isMoving === "up" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </PremiumButton>
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-10 px-4"
            disabled={isLast || Boolean(isMoving)}
            onClick={() => handleMove("down")}
          >
            {isMoving === "down" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ArrowDown className="size-4" />
            )}
          </PremiumButton>
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-10 px-4 text-red-600 hover:bg-red-50"
            disabled={isDeleting}
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            {isDeleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </PremiumButton>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Удалить урок?"
        description="Урок, transcript, материалы и AI-результаты для него будут удалены из builder."
        confirmLabel="Удалить урок"
        pending={isDeleting}
        onConfirm={() => {
          setIsDeleteDialogOpen(false);
          handleDelete();
        }}
      />

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`lesson-title-${lesson.id}`}>Название</Label>
            <Input id={`lesson-title-${lesson.id}`} {...form.register("title")} />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`lesson-description-${lesson.id}`}>Описание</Label>
            <Textarea
              id={`lesson-description-${lesson.id}`}
              className="min-h-[104px]"
              {...form.register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`lesson-video-${lesson.id}`}>Video URL</Label>
            <Input
              id={`lesson-video-${lesson.id}`}
              placeholder="https://youtube.com/... or /uploads/demo-video.mp4"
              {...form.register("videoUrl")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`lesson-duration-${lesson.id}`}>Duration</Label>
            <Input
              id={`lesson-duration-${lesson.id}`}
              type="number"
              min="1"
              step="1"
              {...form.register("durationMinutes")}
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <MockUploadDropzone
              id={`lesson-video-upload-${lesson.id}`}
              title="Upload lesson video"
              description="Для MVP можно либо вставить video URL вручную, либо выбрать файл и сохранить mock storage URL."
              hint="Accepted for mock mode: .mp4, .mov, .webm. После выбора мы сохраним fake URL вида /uploads/demo-file-name.mp4."
              accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
              icon={Film}
              currentLabel={videoUploadLabel}
              onUploaded={(payload) => {
                form.setValue("videoUrl", payload.url, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`lesson-content-${lesson.id}`}>Content Text</Label>
            <Textarea
              id={`lesson-content-${lesson.id}`}
              className="min-h-[180px]"
              {...form.register("contentText")}
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`lesson-transcript-${lesson.id}`}>Transcript</Label>
            <Textarea
              id={`lesson-transcript-${lesson.id}`}
              className="min-h-[220px]"
              {...form.register("transcript")}
            />
          </div>

          <div className="space-y-4 lg:col-span-2">
            <MockUploadDropzone
              id={`lesson-transcript-upload-${lesson.id}`}
              title="Upload transcript file"
              description="Можно бросить .txt, .md, .srt или .vtt, а мы сразу развернем текст внутрь transcript textarea."
              hint="Mock mode сохранит файл как structured attachment, а содержимое положит в transcript для последующей AI generation."
              accept=".txt,.md,.srt,.vtt,text/plain,text/markdown"
              icon={FileText}
              currentLabel={transcriptUploads[0]?.name ?? null}
              onUploaded={async (payload) => {
                const transcriptText = await transcriptFileToText(payload.file);

                form.setValue("transcript", transcriptText, {
                  shouldDirty: true,
                  shouldValidate: true,
                });

                const nextMaterials = [
                  ...resourceUploads,
                  {
                    id: payload.id,
                    name: payload.name,
                    url: payload.url,
                    mimeType: payload.mimeType,
                    size: payload.size,
                    kind: "transcript" as const,
                  },
                ];

                form.setValue("materials", nextMaterials, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />

            <MaterialsPreview
              title="Transcript file"
              items={transcriptUploads}
              emptyCopy="Transcript file пока не прикреплен. Позже сюда можно будет подключить Whisper / OpenAI / DeepSeek transcription pipeline."
              onRemove={(id) => {
                form.setValue(
                  "materials",
                  materials.filter((material) => material.id !== id),
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            />
          </div>

          <div className="space-y-4 lg:col-span-2">
            <MockUploadDropzone
              id={`lesson-materials-upload-${lesson.id}`}
              title="Additional lesson materials"
              description="Прикрепи PDF, worksheet, brief, template или любой supporting file для урока."
              hint="Для MVP это mock upload: мы сохраняем список материалов и fake URLs, чтобы потом без боли подключить UploadThing или S3."
              accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.fig,.txt,.md,application/pdf"
              icon={FolderOpen}
              currentLabel={resourceUploads.length ? `${resourceUploads.length} files` : null}
              onUploaded={(payload) => {
                form.setValue(
                  "materials",
                  [
                    ...materials,
                    {
                      id: payload.id,
                      name: payload.name,
                      url: payload.url,
                      mimeType: payload.mimeType,
                      size: payload.size,
                      kind: "resource" as const,
                    },
                  ],
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            />

            <MaterialsPreview
              title="Attached materials"
              items={resourceUploads}
              emptyCopy="Пока нет дополнительных материалов. Сюда можно складывать PDF, cheatsheet, template pack и другие lesson assets."
              onRemove={(id) => {
                form.setValue(
                  "materials",
                  materials.filter((material) => material.id !== id),
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            />
          </div>
        </div>

        {serverError ? <FeedbackMessage message={serverError} /> : null}
        {successMessage ? (
          <FeedbackMessage message={successMessage} tone="success" />
        ) : null}

        <div className="flex flex-wrap gap-3">
          <PremiumButton type="submit" className="h-11 px-5" disabled={isSaving}>
            {isSaving ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save lesson content"
            )}
          </PremiumButton>

          <PremiumButton
            type="button"
            tone="secondary"
            className="h-11 px-5"
            disabled={isGeneratingTranscript || !form.watch("videoUrl")?.trim()}
            onClick={handleGenerateTranscript}
          >
            {isGeneratingTranscript ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Transcribing...
              </>
            ) : (
              <>
                <Mic className="mr-2 size-4" />
                Generate transcript
              </>
            )}
          </PremiumButton>

          <PremiumButton
            type="button"
            tone="secondary"
            className="h-11 px-5"
            disabled={isGeneratingAi || !form.watch("transcript")?.trim()}
            onClick={handleGenerateAi}
          >
            {isGeneratingAi ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Use transcript for AI generation
              </>
            )}
          </PremiumButton>
        </div>
      </form>

      {toast ? <FloatingToast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}

function NewLessonForm({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<LessonFormValues, undefined, LessonFormInput>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      description: "",
      videoUrl: "",
      contentText: "",
      transcript: "",
      materials: [],
      durationMinutes: 12,
    },
  });

  const materials = form.watch("materials") ?? [];
  const videoUrl = form.watch("videoUrl");
  const transcriptUploads = materials.filter(
    (material) => material.kind === "transcript",
  );
  const resourceUploads = materials.filter(
    (material) => material.kind === "resource",
  );
  const videoUploadLabel = videoUrl
    ? videoUrl.split("/").filter(Boolean).at(-1) ?? videoUrl
    : null;

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await createAuthorLesson(moduleId, values);

      if (!result.success) {
        setServerError(result.message);
        setIsPending(false);
        return;
      }

      form.reset({
        title: "",
        description: "",
        videoUrl: "",
        contentText: "",
        transcript: "",
        materials: [],
        durationMinutes: 12,
      });
      setIsPending(false);
      router.refresh();
    });
  });

  return (
    <div className="rounded-[1.8rem] border border-dashed border-black/12 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
          <Plus className="size-4" />
        </div>
        <div>
          <p className="text-sm text-black/46">Новый урок</p>
          <h4 className="text-lg font-semibold tracking-tight text-black">
            Добавить урок в модуль
          </h4>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`new-lesson-title-${moduleId}`}>Название</Label>
            <Input
              id={`new-lesson-title-${moduleId}`}
              placeholder="Lesson title"
              {...form.register("title")}
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`new-lesson-description-${moduleId}`}>Описание</Label>
            <Textarea
              id={`new-lesson-description-${moduleId}`}
              className="min-h-[104px]"
              {...form.register("description")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`new-lesson-video-${moduleId}`}>Video URL</Label>
            <Input
              id={`new-lesson-video-${moduleId}`}
              placeholder="https://youtube.com/... or /uploads/demo-video.mp4"
              {...form.register("videoUrl")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`new-lesson-duration-${moduleId}`}>Duration</Label>
            <Input
              id={`new-lesson-duration-${moduleId}`}
              type="number"
              min="1"
              step="1"
              {...form.register("durationMinutes")}
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`new-lesson-content-${moduleId}`}>Content Text</Label>
            <Textarea
              id={`new-lesson-content-${moduleId}`}
              className="min-h-[180px]"
              {...form.register("contentText")}
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`new-lesson-transcript-${moduleId}`}>Transcript</Label>
            <Textarea
              id={`new-lesson-transcript-${moduleId}`}
              className="min-h-[220px]"
              {...form.register("transcript")}
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <MockUploadDropzone
              id={`new-lesson-video-upload-${moduleId}`}
              title="Upload lesson video"
              description="Можно не ждать реальное storage-подключение: для MVP builder подставит mock URL в videoUrl."
              hint="Выбери или перетащи .mp4 / .mov / .webm. После сохранения урока ссылка будет храниться как /uploads/demo-file-name.ext."
              accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
              icon={Film}
              currentLabel={videoUploadLabel}
              onUploaded={(payload) => {
                form.setValue("videoUrl", payload.url, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          </div>

          <div className="space-y-4 lg:col-span-2">
            <MockUploadDropzone
              id={`new-lesson-transcript-upload-${moduleId}`}
              title="Upload transcript file"
              description="Закинь transcript в виде файла, а форма сама развернет текст в textarea и сохранит attachment-метаданные."
              hint="Поддержка для MVP: .txt, .md, .srt, .vtt. Настоящую транскрибацию видео подключим позже."
              accept=".txt,.md,.srt,.vtt,text/plain,text/markdown"
              icon={FileText}
              currentLabel={transcriptUploads[0]?.name ?? null}
              onUploaded={async (payload) => {
                const transcriptText = await transcriptFileToText(payload.file);

                form.setValue("transcript", transcriptText, {
                  shouldDirty: true,
                  shouldValidate: true,
                });

                form.setValue(
                  "materials",
                  [
                    ...resourceUploads,
                    {
                      id: payload.id,
                      name: payload.name,
                      url: payload.url,
                      mimeType: payload.mimeType,
                      size: payload.size,
                      kind: "transcript" as const,
                    },
                  ],
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            />

            <MaterialsPreview
              title="Transcript file"
              items={transcriptUploads}
              emptyCopy="Transcript file пока нет. После создания урока можно будет сразу запустить AI generation от сохраненного transcript."
              onRemove={(id) => {
                form.setValue(
                  "materials",
                  materials.filter((material) => material.id !== id),
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            />
          </div>

          <div className="space-y-4 lg:col-span-2">
            <MockUploadDropzone
              id={`new-lesson-materials-upload-${moduleId}`}
              title="Additional lesson materials"
              description="Приложи worksheet, PDF, prompts, briefs или шаблоны, чтобы у урока сразу была полноценная asset-структура."
              hint="Mock upload сохраняет список файлов и fake URLs. На следующем шаге сюда легко подключить UploadThing или S3."
              accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.fig,.txt,.md,application/pdf"
              icon={FolderOpen}
              currentLabel={resourceUploads.length ? `${resourceUploads.length} files` : null}
              onUploaded={(payload) => {
                form.setValue(
                  "materials",
                  [
                    ...materials,
                    {
                      id: payload.id,
                      name: payload.name,
                      url: payload.url,
                      mimeType: payload.mimeType,
                      size: payload.size,
                      kind: "resource" as const,
                    },
                  ],
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            />

            <MaterialsPreview
              title="Attached materials"
              items={resourceUploads}
              emptyCopy="Дополнительных материалов пока нет. Можно начать с video URL и transcript, а supporting files добавить следом."
              onRemove={(id) => {
                form.setValue(
                  "materials",
                  materials.filter((material) => material.id !== id),
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            />
          </div>
        </div>

        {serverError ? <FeedbackMessage message={serverError} /> : null}

        <PremiumButton type="submit" className="h-11 px-5" disabled={isPending}>
          {isPending ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Creating lesson...
            </>
          ) : (
            "Create lesson draft"
          )}
        </PremiumButton>
      </form>
    </div>
  );
}

export function ModuleBuilderCard({
  module,
  isFirst,
  isLast,
}: ModuleBuilderCardProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMoving, setIsMoving] = useState<null | "up" | "down">(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<ModuleFormInput>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: module.title,
      description: module.description,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    startTransition(async () => {
      const result = await updateAuthorModule(module.id, values);

      if (!result.success) {
        setServerError(result.message);
        setIsSaving(false);
        return;
      }

      setSuccessMessage(result.message);
      setIsSaving(false);
      router.refresh();
    });
  });

  const handleMove = (direction: "up" | "down") => {
    setServerError(null);
    setSuccessMessage(null);
    setIsMoving(direction);

    startTransition(async () => {
      const result = await moveAuthorModule(module.id, direction);

      if (!result.success) {
        setServerError(result.message);
        setIsMoving(null);
        return;
      }

      setIsMoving(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    setServerError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    startTransition(async () => {
      const result = await deleteAuthorModule(module.id);

      if (!result.success) {
        setServerError(result.message);
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      router.refresh();
    });
  };

  return (
    <PremiumCard padding="lg" className="rounded-[2.4rem] bg-white/92 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">Модуль {module.order}</Badge>
            <span className="text-sm text-black/42">
              {module.lessons.length} уроков
            </span>
          </div>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-black">
            {module.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-10 px-4"
            disabled={isFirst || Boolean(isMoving)}
            onClick={() => handleMove("up")}
          >
            {isMoving === "up" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </PremiumButton>
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-10 px-4"
            disabled={isLast || Boolean(isMoving)}
            onClick={() => handleMove("down")}
          >
            {isMoving === "down" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ArrowDown className="size-4" />
            )}
          </PremiumButton>
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-10 px-4 text-red-600 hover:bg-red-50"
            disabled={isDeleting}
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            {isDeleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </PremiumButton>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Удалить модуль?"
        description="Модуль удалится вместе со всеми уроками, файлами и AI-материалами внутри него."
        confirmLabel="Удалить модуль"
        pending={isDeleting}
        onConfirm={() => {
          setIsDeleteDialogOpen(false);
          handleDelete();
        }}
      />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`module-title-${module.id}`}>Название модуля</Label>
            <Input id={`module-title-${module.id}`} {...form.register("title")} />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor={`module-description-${module.id}`}>Описание</Label>
            <Textarea
              id={`module-description-${module.id}`}
              className="min-h-[120px]"
              {...form.register("description")}
            />
          </div>
        </div>

        {serverError ? <FeedbackMessage message={serverError} /> : null}
        {successMessage ? (
          <FeedbackMessage message={successMessage} tone="success" />
        ) : null}

        <PremiumButton type="submit" className="h-11 px-5" disabled={isSaving}>
          {isSaving ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Сохраняем модуль...
            </>
          ) : (
            "Сохранить модуль"
          )}
        </PremiumButton>
      </form>

      <div className="mt-8 space-y-4">
        {module.lessons.map((lesson, index) => (
          <LessonEditor
            key={lesson.id}
            lesson={lesson}
            isFirst={index === 0}
            isLast={index === module.lessons.length - 1}
          />
        ))}
      </div>

      <div className="mt-6">
        <NewLessonForm moduleId={module.id} />
      </div>
    </PremiumCard>
  );
}
