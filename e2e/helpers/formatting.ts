import { expect, Locator } from '@playwright/test';

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatSar(value: number) {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
  }).format(value);
}

export function currencyFragments(value: number) {
  const abs = Math.abs(value);
  const localized = formatSar(abs);
  const compact = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: abs % 1 === 0 ? 0 : 2,
  });

  return Array.from(new Set([localized, localized.replace(/\s/g, ''), compact]));
}

export async function expectTextToContainOneOf(locator: Locator, parts: string[]) {
  const text = await locator.textContent();
  expect(text ?? '').toBeTruthy();
  const normalized = text ?? '';
  expect(parts.some((part) => normalized.includes(part))).toBeTruthy();
}

export async function expectTextNotToContainAny(locator: Locator, parts: string[]) {
  const text = (await locator.textContent()) ?? '';
  for (const part of parts) {
    expect(text).not.toContain(part);
  }
}
