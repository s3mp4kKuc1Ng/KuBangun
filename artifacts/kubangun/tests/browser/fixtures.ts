import { test as base, expect, type Page } from '@playwright/test';
import type { Project } from '../../src/lib/types';

export const projectId = 'browser-regression-project';
const storageKey = 'kubangun.projects.v1';
const timestamp = '2026-01-01T00:00:00.000Z';

export function fixtureProject(): Project {
  return {
    id: projectId, name: 'Isolated renovation regression', mode: 'renovation',
    province: 'Test', city: 'Test', floors: 1, landArea: 80, footprintArea: 40,
    totalArea: 40, structure: 'Tidak diketahui', material: 'Tidak diketahui',
    description: '', revision: 7, createdAt: timestamp, updatedAt: timestamp,
    status: 'review-requested', reviewRequestedAt: timestamp, reviewRequestedRevision: 7,
    archived: false, components: [], observations: [], changes: [], reviewNotes: [],
    documents: [{ id: 'evidence', name: 'Existing survey.pdf', mime: 'application/pdf',
      size: 100, sourceState: 'existing', uploadedAt: timestamp }],
    // Deliberately no state, even though the mode, name and document suggest one.
    rooms: [{ id: 'legacy', name: 'Eksisting lama', floor: 1, length: 3, width: 4,
      height: 2.8, source: 'dokumen', documentId: 'evidence', confirmed: true }],
  };
}

export const test = base.extend({
  storageState: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Browser regression tests require a baseURL');
    // Loaded once into each NEW context, not an init script that reseeds on reload.
    await use({ cookies: [], origins: [{
      origin: new URL(baseURL).origin,
      localStorage: [{ name: storageKey, value: JSON.stringify([fixtureProject()]) }],
    }] });
  },
});
export { expect };

export async function openRooms(page: Page) {
  await page.goto(`./projects/${projectId}?tab=ruang`);
  await expect(page.getByTestId('text-project-name')).toHaveText('Isolated renovation regression');
  await expect(page.getByTestId('tab-ruang')).toHaveAttribute('aria-selected', 'true');
}

export async function savedProject(page: Page): Promise<Project> {
  return page.evaluate(({ key, id }) => {
    const project = (JSON.parse(localStorage.getItem(key) || '[]') as Project[])
      .find((p) => p.id === id);
    if (!project) throw new Error('Isolated fixture is missing');
    return project;
  }, { key: storageKey, id: projectId });
}

export async function expectMutation(page: Page, revision: number) {
  await expect(page.getByText(`Revisi ${revision}`, { exact: true })).toBeVisible();
  await expect(page.getByText('Draf', { exact: true })).toBeVisible();
  const p = await savedProject(page);
  expect(p.revision).toBe(revision);
  expect(p.status).toBe('draft');
  expect(p.reviewRequestedAt).toBeUndefined();
  expect(p.reviewRequestedRevision).toBeUndefined();
}

export async function requestReview(page: Page, revision: number) {
  await page.getByTestId('tab-tinjauan').click();
  await page.getByTestId('button-request-review').click();
  await expect(page.getByTestId('button-cancel-request')).toBeVisible();
  const p = await savedProject(page);
  expect(p.revision).toBe(revision); // Requesting a review isn't a data revision.
  expect(p.status).toBe('review-requested');
  expect(p.reviewRequestedRevision).toBe(revision);
  expect(p.reviewRequestedAt).toBeTruthy();
  await page.getByTestId('tab-ruang').click();
}

export async function addRoom(page: Page, name: string, state: 'existing' | 'proposed') {
  await page.getByTestId('button-add-room').click();
  await page.getByTestId('select-room-state').selectOption(state);
  await page.getByTestId('input-room-name').fill(name);
  await page.getByTestId('input-room-length').fill('5');
  await page.getByTestId('input-room-width').fill('4');
  await page.getByTestId('button-save-room').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const p = await savedProject(page);
  const room = p.rooms.find((r) => r.name === name);
  if (!room) throw new Error('Created room not persisted');
  return room.id;
}