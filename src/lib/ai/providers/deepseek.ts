import { createOpenAiCompatibleProvider } from "@/lib/ai/utils";

let deepSeekProviderInstance:
  | ReturnType<typeof createOpenAiCompatibleProvider>
  | undefined;

export function getDeepSeekProvider() {
  if (!deepSeekProviderInstance) {
    deepSeekProviderInstance = createOpenAiCompatibleProvider({
      name: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      model: "deepseek-chat",
    });
  }

  return deepSeekProviderInstance;
}
