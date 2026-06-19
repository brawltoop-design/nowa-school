"use client";

import {
  Clock3,
  FileText,
  MonitorPlay,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDurationMinutes } from "@/lib/utils";

type LessonVideoPlayerProps = {
  title: string;
  description: string;
  moduleTitle: string;
  lessonLabel?: string;
  durationMinutes: number;
  videoUrl: string | null;
  coverUrl: string | null;
  hasTranscript: boolean;
  hasQuiz: boolean;
  hasAssignment: boolean;
};

const DEFAULT_DEMO_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

type VideoSource =
  | {
      type: "embed";
      src: string;
      note: string;
    }
  | {
      type: "video";
      src: string;
      note: string;
    };

function getYouTubeEmbedUrl(value: string) {
  const shortMatch = value.match(/youtu\.be\/([^?&/]+)/i);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  const longMatch = value.match(/[?&]v=([^?&/]+)/i);
  if (longMatch?.[1]) {
    return `https://www.youtube.com/embed/${longMatch[1]}`;
  }

  return null;
}

function getVimeoEmbedUrl(value: string) {
  const match = value.match(/vimeo\.com\/(\d+)/i);
  return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
}

function resolveVideoSource(videoUrl: string | null): VideoSource {
  if (!videoUrl) {
    return {
      type: "video",
      src: DEFAULT_DEMO_VIDEO,
      note: "Для MVP показываем демо-плеер, даже если автор еще не добавил видео.",
    };
  }

  const youtubeEmbed = getYouTubeEmbedUrl(videoUrl);
  if (youtubeEmbed) {
    return {
      type: "embed",
      src: youtubeEmbed,
      note: "YouTube embed",
    };
  }

  const vimeoEmbed = getVimeoEmbedUrl(videoUrl);
  if (vimeoEmbed) {
    return {
      type: "embed",
      src: vimeoEmbed,
      note: "Vimeo embed",
    };
  }

  if (
    videoUrl.includes("cdn.newschool.ai/demo/") ||
    videoUrl.startsWith("/uploads/")
  ) {
    return {
      type: "video",
      src: DEFAULT_DEMO_VIDEO,
      note: "Сейчас подключен demo-player. Позже здесь можно подменить его на реальный storage URL автора.",
    };
  }

  return {
    type: "video",
    src: videoUrl,
    note: "Видео урока",
  };
}

export function LessonVideoPlayer({
  title,
  description,
  moduleTitle,
  lessonLabel,
  durationMinutes,
  videoUrl,
  coverUrl,
  hasTranscript,
  hasQuiz,
  hasAssignment,
}: LessonVideoPlayerProps) {
  const source = resolveVideoSource(videoUrl);

  return (
    <div className="overflow-hidden rounded-[2.4rem] border border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.14),transparent_26%),linear-gradient(180deg,#10131c_0%,#090b11_100%)] text-white shadow-[0_22px_70px_rgba(15,23,42,0.2)]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="subtle" className="border-white/12 bg-white/10 text-white">
                Lesson player
              </Badge>
              <Badge variant="subtle" className="border-white/12 bg-white/10 text-white/80">
                {moduleTitle}
              </Badge>
              {lessonLabel ? (
                <Badge
                  variant="subtle"
                  className="border-white/12 bg-white/10 text-white/80"
                >
                  {lessonLabel}
                </Badge>
              ) : null}
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66 sm:text-[15px]">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5">
              <Clock3 className="size-4" />
              {formatDurationMinutes(durationMinutes)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5">
              <MonitorPlay className="size-4" />
              HD lesson
            </span>
          </div>
        </div>
      </div>

      <div className="aspect-video bg-black">
        {source.type === "embed" ? (
          <iframe
            src={source.src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <video
            key={source.src}
            controls
            playsInline
            preload="metadata"
            poster={coverUrl ?? undefined}
            className="h-full w-full bg-black object-cover"
          >
            <source src={source.src} />
          </video>
        )}
      </div>

      <div className="grid gap-4 border-t border-white/10 px-5 py-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white/78">
            <PlayCircle className="size-4 text-white" />
            Видео
          </span>
          {hasTranscript ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white/78">
              <FileText className="size-4 text-white" />
              Transcript
            </span>
          ) : null}
          {hasQuiz ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white/78">
              <Sparkles className="size-4 text-white" />
              Quiz
            </span>
          ) : null}
          {hasAssignment ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white/78">
              <Sparkles className="size-4 text-white" />
              Assignment
            </span>
          ) : null}
        </div>

        <p className="max-w-xl text-sm leading-7 text-white/56">
          {source.note}
        </p>
      </div>
    </div>
  );
}
