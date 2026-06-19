export type TranscriptionProviderName = "mock" | "openai";

export type TranscriptionInput = {
  fileUrl: string;
  lessonId: string;
};

export type TranscriptionResult = {
  transcript: string;
  durationMinutes?: number;
  provider: TranscriptionProviderName;
};

export interface TranscriptionProvider {
  name: TranscriptionProviderName;
  transcribeAudioOrVideo(
    input: TranscriptionInput,
  ): Promise<TranscriptionResult>;
}
