import { createOpenAiCompatibleProvider } from "@/lib/ai/utils";

let openAiProviderInstance:
  | ReturnType<typeof createOpenAiCompatibleProvider>
  | undefined;

export function getOpenAiProvider() {
  if (!openAiProviderInstance) {
    openAiProviderInstance = createOpenAiCompatibleProvider({
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY ?? "",
      model: "gpt-4o-mini",
    });
  }

  return openAiProviderInstance;
}
