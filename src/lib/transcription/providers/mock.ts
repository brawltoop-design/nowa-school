import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from "@/lib/transcription/types";

function buildTopicLabel(fileUrl: string, lessonId: string) {
  const lastSegment =
    fileUrl.split("/").filter(Boolean).at(-1) ??
    `lesson-${lessonId.slice(0, 6)}`;

  return lastSegment
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function estimateDurationMinutes(seed: string) {
  const score = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 8 + (score % 9);
}

function buildMockTranscript(input: TranscriptionInput): string {
  const topic = buildTopicLabel(input.fileUrl, input.lessonId);

  return [
    `Сегодня в уроке мы разбираем тему "${topic}". Сначала фиксируем конечный результат: студент должен понять, какой практический артефакт он соберет после просмотра и какие шаги для этого нужны.`,
    "Дальше мы раскладываем урок на понятные блоки. Сначала даем контекст, затем показываем основной workflow, после этого добавляем короткую проверку понимания и завершаем урок следующим действием, которое можно сделать сразу после просмотра.",
    "Отдельное внимание уделяем качеству материалов. Хороший урок не перегружает студента терминами, а ведет от простого к прикладному: что именно открыть, что нажать, как проверить результат и где чаще всего возникают ошибки.",
    "Если урок связан с AI или автоматизацией, важно не просто показать prompt или инструмент, а объяснить, почему выбран именно такой сценарий, какие ограничения есть у модели и как адаптировать решение под свой проект.",
    "В финале урока студент получает понятный outcome: готовый шаг, черновик, шаблон, mini-system или часть будущего проекта. Именно это потом можно использовать для summary, quiz, assignment и checklist внутри курса.",
  ].join("\n\n");
}

export const mockTranscriptionProvider: TranscriptionProvider = {
  name: "mock",
  async transcribeAudioOrVideo(
    input: TranscriptionInput,
  ): Promise<TranscriptionResult> {
    return {
      transcript: buildMockTranscript(input),
      durationMinutes: estimateDurationMinutes(`${input.lessonId}:${input.fileUrl}`),
      provider: "mock",
    };
  },
};
