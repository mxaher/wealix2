type NvidiaChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      reasoning_content?: string;
    };
  }>;
};

export function extractNvidiaResponseText(payload: NvidiaChatResponse | null | undefined) {
  const message = payload?.choices?.[0]?.message;
  if (!message) {
    return '';
  }

  if (typeof message.content === 'string') {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    const text = message.content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
    if (text) {
      return text;
    }
  }

  return typeof message.reasoning_content === 'string' ? message.reasoning_content.trim() : '';
}
