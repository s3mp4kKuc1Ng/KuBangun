import { test, expect, fixtureProject, savedProject } from './fixtures';
import type { Page } from '@playwright/test';
import type { Project } from '../../src/lib/types';
import { projectJson, projectsJson } from '../../src/lib/export';

const key = 'kubangun.projects.v1';
function backupProject(): Project {
  const p = fixtureProject();
  return { ...p, id: 'imported', name: 'Restored backup', rooms: [
    p.rooms[0],
    { ...p.rooms[0], id: 'existing', state: 'existing' },
    { ...p.rooms[0], id: 'proposed', state: 'proposed', existingRoomId: 'existing', length: 5 },
  ] };
}
async function choose(page: Page, json: unknown) {
  await page.getByTestId('input-import-backup').setInputFiles({
    name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)),
  });
}
async function stored(page: Page): Promise<Project[]> {
  return page.evaluate((k) => {
    const parsed = JSON.parse(localStorage.getItem(k) || '[]');
    return Array.isArray(parsed) ? parsed : parsed.projects;
  }, key);
}

test('preview and cancel are safe; confirmed single-project restore survives reload with unavailable evidence', async ({ page }) => {
  await page.goto('./settings');
  const before = await stored(page);
  await choose(page, projectJson(backupProject()));
  await expect(page.getByTestId('list-import-preview')).toContainText('1 belum berlabel');
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('button-cancel-import').click();
  expect(await stored(page)).toEqual(before);
  await choose(page, projectJson(backupProject()));
  await page.getByTestId('button-confirm-import').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const restored = (await stored(page)).find((p) => p.id === 'imported')!;
  expect(restored.revision).toBe(7);
  expect(restored.status).toBe('review-requested');
  expect(restored.reviewRequestedRevision).toBe(7);
  expect(restored.rooms[2].existingRoomId).toBe('existing');
  expect(restored.rooms[0].state).toBeUndefined();
  expect(restored.documents[0].availability).toBe('unavailable');
  expect(restored.rooms[0].documentId).toBe(restored.documents[0].id);
  expect(await savedProject(page)).toEqual(before[0]);
  await page.reload();
  await page.goto('./projects/imported?tab=dokumen');
  const doc = restored.documents[0];
  await expect(page.getByTestId(`card-doc-${doc.id}`)).toContainText('Tidak tersedia');
  await expect(page.getByTestId(`button-preview-${doc.id}`)).toBeDisabled();
  await expect(page.getByTestId(`button-download-${doc.id}`)).toBeDisabled();
  await page.getByTestId('tab-laporan').click();
  await expect(page.getByText('Isi berkas tidak tersedia — hanya metadata cadangan.')).toBeVisible();
  await expect(page.getByText(/Laporan pendahuluan \/ draf/)).toBeVisible();
  await page.getByTestId('tab-dokumen').click();
  // Set the target using the visible control, without opening the OS picker.
  page.once('filechooser', (chooser) => void chooser.setFiles({
    name: doc.name, mimeType: doc.mime, buffer: Buffer.alloc(doc.size, 32),
  }));
  await page.getByTestId(`button-supply-${doc.id}`).click();
  await expect(page.getByTestId(`button-preview-${doc.id}`)).toBeEnabled();
  const supplied = (await stored(page)).find((p) => p.id === 'imported')!;
  expect(supplied.revision).toBe(8);
  expect(supplied.status).toBe('draft');
  expect(supplied.reviewRequestedRevision).toBeUndefined();
  expect(supplied.rooms).toEqual(restored.rooms);
  await page.reload();
  await expect(page.getByTestId(`button-download-${doc.id}`)).toBeEnabled();
});

test('all-project restore handles skip and copy without overwriting; copy preserves room links', async ({ page }) => {
  await page.goto('./settings');
  const before = await savedProject(page);
  await choose(page, projectsJson([fixtureProject(), backupProject()]));
  await expect(page.getByTestId('select-import-duplicates')).toHaveValue('skip');
  await expect(page.getByTestId('button-confirm-import')).toHaveText('Pulihkan 1 proyek');
  await page.getByTestId('button-confirm-import').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await savedProject(page)).toEqual(before);
  expect((await stored(page)).length).toBe(2);
  await choose(page, projectJson(backupProject()));
  await expect(page.getByTestId('button-confirm-import')).toBeDisabled();
  await page.getByTestId('select-import-duplicates').selectOption('copy');
  await page.getByTestId('button-confirm-import').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const all = await stored(page);
  const copied = all.find((p) => p.name === 'Restored backup (salinan)')!;
  expect(copied.id).not.toBe('imported');
  expect(copied.rooms[2].existingRoomId).toBe(copied.rooms[1].id);
  expect(copied.rooms[0].documentId).toBe(copied.documents[0].id);
  expect(copied.revision).toBe(7);
  expect(await savedProject(page)).toEqual(before);
  await page.reload();
  expect((await stored(page)).length).toBe(3);
});

test('invalid backups and storage failure cannot partially restore or claim success', async ({ page }) => {
  await page.goto('./settings');
  const before = await stored(page);
  await choose(page, { format: 'kubangun-project-v2' });
  await expect(page.getByTestId('text-import-error')).toContainText('Format');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await choose(page, projectsJson([backupProject(), { ...backupProject(), id: 'invalid', rooms: [{ ...backupProject().rooms[0], length: -2 }] }]));
  await expect(page.getByTestId('text-import-error')).toBeVisible();
  expect(await stored(page)).toEqual(before);
  await choose(page, projectJson(backupProject()));
  await page.evaluate((k) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === k) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      original.call(this, name, value);
    };
  }, key);
  await page.getByTestId('button-confirm-import').click();
  await expect(page.getByTestId('text-import-error')).toContainText('Tidak ada proyek diubah');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('button-cancel-import').click();
  await page.reload();
  expect(await stored(page)).toEqual(before);
});