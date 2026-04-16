// BUG #023 FIX — Sanitize AI responses before rendering (prevents XSS)
import sanitizeHtml from 'sanitize-html';

export function sanitizeAiResponse(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: ['p', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'h3', 'h4'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}
