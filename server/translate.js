import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPTS = {
  "es-to-en": `You are a real-time translator. Translate the following Spanish text to English.
Output ONLY the translation, nothing else. Preserve the tone and intent of the original.`,
  "en-to-es": `You are a real-time translator. Translate the following English text to Spanish.
Output ONLY the translation, nothing else. Preserve the tone and intent of the original.`,
};

/**
 * Translate text using Claude API with streaming.
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code ("es" or "en")
 * @param {(chunk: string) => void} onChunk - Callback for each streamed text chunk
 * @returns {Promise<string>} Full translated text
 */
export async function translateText(text, sourceLanguage, onChunk) {
  const direction =
    sourceLanguage === "es" ? "es-to-en" : "en-to-es";

  let fullText = "";

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPTS[direction],
    messages: [{ role: "user", content: text }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      if (onChunk) onChunk(event.delta.text);
    }
  }

  return fullText;
}
