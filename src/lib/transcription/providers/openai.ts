import OpenAI from "openai";
import { mockTranscriptionProvider } from "@/lib/transcription/providers/mock";
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from "@/lib/transcription/types";

const DIRECT_MEDIA_FILE_PATTERN =
  /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg|mov)$/i;

function canFetchSourceDirectly(fileUrl: string) {
  return /^https?:\/\//i.test(fileUrl) && DIRECT_MEDIA_FILE_PATTERN.test(fileUrl);
}

function getFileName(fileUrl: string) {
  return fileUrl.split("/").filter(Boolean).at(-1) ?? "lesson-media.mp4";
}

let openAiClient: OpenAI | null | undefined;

function getClient() {
  if (openAiClient !== undefined) {
    return openAiClient;
  }

  if (!process.env.OPENAI_API_KEY) {
    openAiClient = null;
    return openAiClient;
  }

  openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openAiClient;
}

async function downloadRemoteMedia(fileUrl: string) {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`);
  }

  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const bytes = await response.arrayBuffer();

  return new File([bytes], getFileName(fileUrl), {
    type: contentType,
  });
}

export const openAiTranscriptionProvider: TranscriptionProvider = {
  name: "openai",
  async transcribeAudioOrVideo(
    input: TranscriptionInput,
  ): Promise<TranscriptionResult> {
    const client = getClient();

    if (!client) {
      return mockTranscriptionProvider.transcribeAudioOrVideo(input);
    }

    if (!canFetchSourceDirectly(input.fileUrl)) {
      // TODO: when real storage is connected, resolve local /uploads URLs or signed S3 URLs here.
      return mockTranscriptionProvider.transcribeAudioOrVideo(input);
    }

    try {
      const file = await downloadRemoteMedia(input.fileUrl);
      const result = await client.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
        response_format: "verbose_json",
      });

      const transcript = typeof result.text === "string" ? result.text.trim() : "";
      const durationSeconds =
        typeof result.duration === "number" ? result.duration : undefined;

      if (!transcript) {
        return mockTranscriptionProvider.transcribeAudioOrVideo(input);
      }

      return {
        transcript,
        durationMinutes:
          typeof durationSeconds === "number"
            ? Math.max(1, Math.ceil(durationSeconds / 60))
            : undefined,
        provider: "openai",
      };
    } catch {
      return mockTranscriptionProvider.transcribeAudioOrVideo(input);
    }
  },
};
