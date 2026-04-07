import type { Page } from '@playwright/test';
import { clonePersona, type PersonaName } from '../fixtures/personas';
import { seedWorkspace } from './seed-api';

export async function seedPersona(page: Page, personaName: PersonaName) {
  const workspace = clonePersona(personaName);
  await seedWorkspace(page, workspace);
  return workspace;
}
