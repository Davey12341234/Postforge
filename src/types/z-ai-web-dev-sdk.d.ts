declare module "z-ai-web-dev-sdk" {
  type Thinking = { type: "enabled" } | { type: "disabled" };

  export default class ZAI {
    constructor(config: { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string });
    chat: {
      completions: {
        create: (body: {
          model: string;
          messages: { role: string; content: string }[];
          stream: boolean;
          thinking?: Thinking;
        }) => Promise<ReadableStream<Uint8Array> | unknown>;
      };
    };
    functions: {
      invoke: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    };
  }
}
