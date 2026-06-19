import { mockTranscriptionProvider } from "@/lib/transcription/providers/mock";
import { openAiTranscriptionProvider } from "@/lib/transcription/providers/openai";
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionProviderName,
  TranscriptionResult,
} from "@/lib/transcription/types";

function normalizeProviderName(
  value: string | undefined,
): TranscriptionProviderName {
  switch (value?.toLowerCase()) {
    case "openai":
      return "openai";
    default:
      return "mock";
  }
}

export function getActiveTranscriptionProviderName(): TranscriptionProviderName {
  const configuredProvider = normalizeProviderName(
    process.env.TRANSCRIPTION_PROVIDER,
  );

  if (configuredProvider === "openai" && process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return "mock";
}

export function getTranscriptionProvider(): TranscriptionProvider {
  switch (getActiveTranscriptionProviderName()) {
    case "openai":
      return openAiTranscriptionProvider;
    default:
      return mockTranscriptionProvider;
  }
}

export async function transcribeAudioOrVideo(
  input: TranscriptionInput,
): Promise<TranscriptionResult> {
  return getTranscriptionProvider().transcribeAudioOrVideo(input);
}

export * from "@/lib/transcription/types";
