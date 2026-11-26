import type { Provider } from "./index";
export const providerNames: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Claude",
  google: "Gemini",
};
