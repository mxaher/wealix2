import { describe, expect, test } from 'bun:test';
import { extractNvidiaResponseText } from './response';

describe('internal agents NVIDIA response handling', () => {
  test('returns plain string content when present', () => {
    expect(
      extractNvidiaResponseText({
        choices: [{ message: { content: '  hello world  ' } }]
      })
    ).toBe('hello world');
  });

  test('joins segmented content arrays', () => {
    expect(
      extractNvidiaResponseText({
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: 'first line' },
                { type: 'text', text: 'second line' }
              ]
            }
          }
        ]
      })
    ).toBe('first line\nsecond line');
  });

  test('falls back to reasoning content when standard content is empty', () => {
    expect(
      extractNvidiaResponseText({
        choices: [{ message: { reasoning_content: 'reasoned answer' } }]
      })
    ).toBe('reasoned answer');
  });
});
