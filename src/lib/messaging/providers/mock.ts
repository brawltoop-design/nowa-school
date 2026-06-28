import { randomUUID } from "crypto";
import type { MessagingProvider } from "@/lib/messaging/types";

export const mockMessagingProvider: MessagingProvider = {
  name: "MOCK",
  async sendMessage(input) {
    return {
      provider: "MOCK",
      status: "sent",
      externalMessageId: `mock_${randomUUID()}`,
      metadata: {
        channel: input.payload.channel,
      },
    };
  },
};
