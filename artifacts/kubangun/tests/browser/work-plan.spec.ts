import { test, expect, fixtureProject, projectId, savedProject } from './fixtures';
import { blankMaterial, blankWork, getWorkPlan, startExecution } from '../../src/lib/work-plan';
import { projectJson } from '../../src/lib/export';
import { parseBackup, prepareImport } from '../../src/lib/import';
import { readFile } from 'node:fs/promises';
import { PROJECT_KEY, PROJECT_LOCK } from '../../src/lib/project-storage';

async function seedPlan(page: import('@playwright/test').Page, started = false) {
  let p = fixtureProject();
  p.rooms = [{ ...p.rooms[0], length: 5, width: 6 }];
  const work = { ...blankWork('floor-1', 'legacy'), id: 'work-one', name: 'Pemasangan Keramik Lantai', materials: [
    { ...blankMaterial('Semen'), id: 'cement', mode: 'rate' as const, factor: 3 },
    { ...blankMaterial('Keramik'), id: 'tile', mode: 'coverage' as const, unit: 'dus' as const, factor: 4, waste: 10, specification: '1 m × 1 m; 4 m²/dus' },
  ] };
  p.workPlan = { ...getWorkPlan(p), items: [work] };
  if (started) p = startExecution(p);
  await page.goto('/');
  await page.evaluate((p) => localStorage.setItem('kubangun.projects.v1', JSON.stringify([p])), p);
  await page.goto(`/projects/${projectId}?tab=pekerjaan`);
  await expect(page.getByTestId('panel-work-planning')).toBeVisible();
}
async function saveProgress(page: import('@playwright/test').Page, quantity = '15', note = 'Pemasangan hari ini') {
  await page.getByTestId('button-progress-work-one').click();
  await page.getByTestId('input-completed').fill(quantity);
  await page.getByTestId('input-progress-note').fill(note);
  await page.getByLabel('Semen (kg)', { exact: false }).fill('12');
  await page.getByTestId('button-save-progress').click();
}
test('start, cumulative progress, blocked notification, read controls and reload persist atomically', async ({ page }) => {
  await seedPlan(page);
  await page.getByTestId('button-start-execution').click();
  await page.getByLabel('Catatan baseline awal').fill('Rencana disepakati pengguna');
  await page.getByRole('button', { name: 'Mulai dan simpan baseline' }).click();
  await expect(page.getByTestId('button-rebaseline')).toBeVisible();
  let p = await savedProject(page);
  expect(p.workPlan!.baselines[0].items[0].quantity).toBe(30);
  expect(p.workPlan!.baselines[0].items[0].materials[1].procurement).toBe(9);
  await saveProgress(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('row-progress-work-one')).toContainText('50%');
  const unchangedRevision = (await savedProject(page)).revision;
  await page.getByTestId('button-progress-work-one').click();
  await page.getByTestId('input-progress-note').fill('Pemasangan hari ini');
  await page.getByTestId('button-save-progress').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await savedProject(page)).revision).toBe(unchangedRevision);
  expect((await savedProject(page)).workPlan!.updates).toHaveLength(1);
  await page.getByTestId('button-progress-work-one').click();
  await page.locator('label').filter({ hasText: /^Status/ }).locator('select').selectOption('blocked');
  await page.getByTestId('input-progress-note').fill('Menunggu material');
  await page.getByTestId('button-save-progress').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  p = await savedProject(page);
  expect(p.workPlan!.updates).toHaveLength(2);
  expect(p.workPlan!.notifications).toHaveLength(3);
  const revision = p.revision;
  await page.getByTestId('tab-notifikasi').click();
  await expect(page.getByTestId('panel-owner-inbox')).toContainText('3 belum dibaca');
  await page.getByTestId('button-mark-all-read').click();
  await expect(page.getByTestId('panel-owner-inbox')).toContainText('0 belum dibaca');
  expect((await savedProject(page)).revision).toBe(revision);
  await page.reload();
  p = await savedProject(page);
  expect(p.workPlan!.notifications).toHaveLength(3);
  expect(p.workPlan!.notifications.every((n) => n.readAt)).toBe(true);
  await page.getByTestId('tab-pekerjaan').click();
  await expect(page.getByTestId('row-progress-work-one')).toContainText('Terhambat');
});
test('failed progress save retains prior history and notification inbox; retry succeeds', async ({ page }) => {
  await seedPlan(page, true);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'kubangun.projects.v1') throw new DOMException('test quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await saveProgress(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('text-form-error')).toContainText('gagal');
  let p = await savedProject(page);
  expect(p.workPlan!.updates).toHaveLength(0);
  expect(p.workPlan!.notifications).toHaveLength(1);
  await page.reload();
  await saveProgress(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  p = await savedProject(page);
  expect(p.workPlan!.updates).toHaveLength(1);
  expect(p.workPlan!.notifications).toHaveLength(2);
});
test('dimension edit requires reasoned rebaseline and reports/exports retain original estimates', async ({ page }) => {
  await seedPlan(page, true);
  await saveProgress(page);
  await page.getByTestId('tab-ruang').click();
  await page.getByTestId('row-room-legacy').getByRole('button', { name: 'Ubah', exact: true }).click();
  await page.getByTestId('input-room-width').fill('8');
  await page.getByTestId('button-save-room').click();
  await page.getByTestId('tab-pekerjaan').click();
  await expect(page.getByTestId('warn-baseline-outdated')).toBeVisible();
  await page.getByTestId('button-progress-work-one').click();
  await page.getByTestId('input-progress-note').fill('Tidak boleh tersimpan');
  await page.getByTestId('button-save-progress').click();
  await expect(page.getByTestId('text-form-error')).toContainText('kedaluwarsa');
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await page.getByTestId('button-rebaseline').click();
  await page.getByLabel('Alasan perubahan baseline (wajib)').fill('Ukuran baru setelah survei');
  await page.getByRole('button', { name: 'Simpan baseline', exact: true }).click();
  await expect(page.getByTestId('warn-baseline-outdated')).toHaveCount(0);
  const p = await savedProject(page);
  expect(p.workPlan!.baselines.map((b) => b.items[0].quantity)).toEqual([30, 40]);
  expect(p.workPlan!.updates[0].completedQuantity).toBe(15);
  await page.getByTestId('tab-laporan').click();
  await expect(page.getByTestId('report-work')).toContainText('30 m²');
  await expect(page.getByTestId('report-work')).toContainText('40 m²');
  await expect(page.getByTestId('report-work')).toContainText('Ukuran baru setelah survei');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const backup = JSON.stringify(projectJson(p));
  expect(backup).toContain('notifications');
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByTestId('report-work')).toBeVisible();
  await expect(page.getByTestId('report-view')).toContainText('Bukan hasil tinjauan profesional');
});
test('phone rooftop work requires explicit area; materials show missing rates instead of estimates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedPlan(page);
  await page.getByTestId('button-add-direct-rooftop').click();
  await page.getByTestId('select-template').selectOption('template-roof');
  await page.getByTestId('button-save-work').click();
  await expect(page.getByTestId('text-form-error')).toBeVisible();
  await page.getByTestId('input-work-qty').fill('25');
  await page.getByTestId('button-save-work').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const p = await savedProject(page);
  const roof = p.workPlan!.items.find((w) => w.name === 'Pemasangan Atap Alderon')!;
  expect(roof.roomId).toBeUndefined();
  expect(roof.quantity).toBe(25);
  expect(roof.materials[0].factor).toBeNull();
  await expect(page.getByTestId(`card-work-${roof.id}`)).toContainText('25 m²');
  await expect(page.getByTestId('panel-work-planning')).toContainText('Isi cakupan');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
test('moving work cannot orphan historic room references when deleting the original room', async ({ page }) => {
  await seedPlan(page, true);
  const initial = await savedProject(page);
  initial.rooms.push({ ...initial.rooms[0], id: 'room-b', name: 'Ruang B' });
  await page.evaluate((p) => localStorage.setItem('kubangun.projects.v1', JSON.stringify([p])), initial);
  await page.reload();
  await page.getByTestId('button-edit-work-work-one').click();
  await page.getByRole('dialog').locator('label').filter({ hasText: 'Ruang terukur' }).locator('select').selectOption('room-b');
  await page.getByTestId('button-save-work').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const moved = await savedProject(page);
  expect(moved.workPlan!.items[0].roomId).toBe('room-b');
  await page.getByTestId('tab-ruang').click();
  await page.getByTestId('row-room-legacy').getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByTestId('warning-historical-room')).toContainText('baseline lama');
  await expect(page.getByTestId('button-confirm')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pertahankan ruang' }).click();
  const saved = await savedProject(page);
  expect(saved.rooms).toHaveLength(2);
  expect(saved.revision).toBe(moved.revision);
  const restored = parseBackup(JSON.stringify(projectJson(saved)))[0];
  expect(restored.workPlan!.baselines[0].items[0].work.roomId).toBe('legacy');
  let n = 0;
  const copied = prepareImport([restored], [restored], 'copy', () => `browser-copy-${++n}`).projects[0];
  expect(copied.workPlan!.items[0].roomId).toBe(copied.rooms[1].id);
  expect(copied.workPlan!.baselines[0].items[0].work.roomId).toBe(copied.rooms[0].id);
});

test('two tabs preserve newer progress and export the rejected draft before reloading', async ({ page, context }) => {
  await seedPlan(page, true);
  const other = await context.newPage();
  await other.goto(`/projects/${projectId}?tab=pekerjaan`);
  await other.getByTestId('button-progress-work-one').click();
  await other.getByTestId('input-completed').fill('9');
  await other.getByTestId('input-progress-note').fill('Draf dari tab kedua');
  await saveProgress(page, '15', 'Progres terbaru dari tab pertama');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const latest = await savedProject(page);
  await expect(other.getByTestId('banner-storage-conflict')).toBeVisible();
  await other.getByTestId('button-save-progress').click();
  await expect(other.getByTestId('text-form-error')).toContainText('gagal');
  await expect(other.getByTestId('input-progress-note')).toHaveValue('Draf dari tab kedua');
  expect(await savedProject(other)).toEqual(latest);
  const downloaded = other.waitForEvent('download');
  await other.getByTestId('button-export-conflict-draft').click();
  const path = await (await downloaded).path();
  const draft = parseBackup(await readFile(path!, 'utf8'))[0];
  expect(draft.workPlan!.updates.at(-1)!.note).toBe('Draf dari tab kedua');
  expect(draft.workPlan!.updates.at(-1)!.completedQuantity).toBe(9);
  expect(await savedProject(other)).toEqual(latest);
  await other.getByTestId('button-reload-latest').click();
  await expect(other.getByTestId('banner-storage-conflict')).toHaveCount(0);
  await expect(other.getByTestId('row-progress-work-one')).toContainText('Progres terbaru dari tab pertama');
  await saveProgress(other, '20', 'Koreksi setelah memuat ulang');
  await expect(other.getByRole('dialog')).toHaveCount(0);
  const p = await savedProject(other);
  expect(p.workPlan!.updates.map((u) => u.completedQuantity)).toEqual([15, 20]);
  expect(p.workPlan!.notifications).toHaveLength(latest.workPlan!.notifications.length + 1);
  expect(p.workPlan!.baselines).toEqual(latest.workPlan!.baselines);
});

test('new baseline blocks an old tab from saving progress or replacing baseline history', async ({ page, context }) => {
  await seedPlan(page, true);
  await saveProgress(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const other = await context.newPage();
  await other.goto(`/projects/${projectId}?tab=pekerjaan`);
  await other.getByTestId('button-rebaseline').click();
  await other.getByLabel('Alasan perubahan baseline (wajib)').fill('Baseline dari tab tertinggal');
  await page.getByTestId('tab-ruang').click();
  await page.getByTestId('row-room-legacy').getByRole('button', { name: 'Ubah', exact: true }).click();
  await page.getByTestId('input-room-width').fill('8');
  await page.getByTestId('button-save-room').click();
  await page.getByTestId('tab-pekerjaan').click();
  await page.getByTestId('button-rebaseline').click();
  await page.getByLabel('Alasan perubahan baseline (wajib)').fill('Ukuran baru yang disepakati');
  await page.getByRole('button', { name: 'Simpan baseline', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const latest = await savedProject(page);
  expect(latest.workPlan!.baselines.map((b) => b.items[0].quantity)).toEqual([30, 40]);
  await expect(other.getByTestId('banner-storage-conflict')).toBeVisible();
  await other.getByRole('button', { name: 'Simpan baseline', exact: true }).click();
  await expect(other.getByTestId('text-form-error')).toContainText('gagal');
  expect(await savedProject(other)).toEqual(latest);
  await other.getByRole('button', { name: 'Batal', exact: true }).click();
  await saveProgress(other, '18', 'Progres terhadap baseline lama');
  await expect(other.getByTestId('text-form-error')).toContainText('gagal');
  expect(await savedProject(other)).toEqual(latest);
  await other.getByTestId('button-reload-latest').click();
  await expect(other.getByTestId('panel-execution')).toContainText('2 baseline');
  expect((await savedProject(other)).workPlan!.updates).toEqual(latest.workPlan!.updates);
});

test('notification read saves have their own version and cannot erase new entries in another tab', async ({ page, context }) => {
  await seedPlan(page, true);
  await saveProgress(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const other = await context.newPage();
  await other.goto(`/projects/${projectId}?tab=notifikasi`);
  const before = await savedProject(page);
  const beforeRaw = await page.evaluate((key) => localStorage.getItem(key), PROJECT_KEY);
  await page.getByTestId('tab-notifikasi').click();
  await page.getByTestId('button-mark-all-read').click();
  await expect(page.getByTestId('panel-owner-inbox')).toContainText('0 belum dibaca');
  const latest = await savedProject(page);
  const afterRaw = await page.evaluate((key) => localStorage.getItem(key), PROJECT_KEY);
  expect(JSON.parse(afterRaw!).saveVersion).toBeTruthy();
  expect(afterRaw).not.toBe(beforeRaw);
  expect(latest.revision).toBe(before.revision);
  await expect(other.getByTestId('banner-storage-conflict')).toBeVisible();
  await other.getByTestId('button-mark-all-read').click();
  await expect(other.getByTestId('text-form-error')).toContainText('gagal');
  expect(await savedProject(other)).toEqual(latest);
  await other.getByTestId('tab-pekerjaan').click();
  await saveProgress(other, '22', 'Tidak boleh menghilangkan status dibaca');
  await expect(other.getByTestId('text-form-error')).toContainText('gagal');
  expect(await savedProject(other)).toEqual(latest);
  await other.getByTestId('button-reload-latest').click();
  await page.getByTestId('tab-pekerjaan').click();
  await saveProgress(page, '25', 'Entri baru setelah notifikasi dibaca');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const newest = await savedProject(page);
  await other.getByTestId('tab-notifikasi').click();
  await expect(other.getByTestId('banner-storage-conflict')).toBeVisible();
  // The stale tab sees no unread records, but opening a saved notification
  // must not write its old snapshot back over the new progress.
  await other.getByTestId(`button-open-${latest.workPlan!.notifications[0].id}`).click();
  expect(await savedProject(other)).toEqual(newest);
  await other.getByTestId('button-reload-latest').click();
  const p = await savedProject(other);
  expect(p.workPlan!.updates).toHaveLength(2);
  for (const notification of latest.workPlan!.notifications) {
    expect(p.workPlan!.notifications.find((n) => n.id === notification.id)).toEqual(notification);
  }
  expect(p.workPlan!.notifications.filter((n) => !n.readAt)).toHaveLength(1);
});

test('simultaneous writers are serialized and a missed storage event cannot bypass version checks', async ({ page, context }) => {
  // Suppress event-based warnings so this verifies the locked check at write time.
  await context.addInitScript(() => {
    window.addEventListener('storage', (e) => e.stopImmediatePropagation());
    window.addEventListener('focus', (e) => e.stopImmediatePropagation());
  });
  await seedPlan(page, true);
  await page.reload();
  const other = await context.newPage();
  await other.goto(`/projects/${projectId}?tab=pekerjaan`);
  for (const [tab, note] of [[page, 'Tab A simultan'], [other, 'Tab B simultan']] as const) {
    await tab.getByTestId('button-progress-work-one').click();
    await tab.getByTestId('input-completed').fill('12');
    await tab.getByTestId('input-progress-note').fill(note);
  }
  // Hold the same lock to queue both requests before letting either save.
  await page.evaluate((lock) => {
    const state = window as unknown as { releaseProjectLock: () => void };
    void navigator.locks.request(lock, () => new Promise<void>((resolve) => { state.releaseProjectLock = resolve; }));
  }, PROJECT_LOCK);
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { releaseProjectLock?: () => void }).releaseProjectLock)).toBe('function');
  await Promise.all([page.getByTestId('button-save-progress').click(), other.getByTestId('button-save-progress').click()]);
  await expect.poll(() => page.evaluate(async (lock) => (await navigator.locks.query()).pending?.filter((l) => l.name === lock).length, PROJECT_LOCK)).toBe(2);
  await page.evaluate(() => (window as unknown as { releaseProjectLock: () => void }).releaseProjectLock());
  await expect.poll(async () => (await savedProject(page)).workPlan!.updates.length).toBe(1);
  await expect.poll(async () => await page.getByTestId('banner-storage-conflict').count() + await other.getByTestId('banner-storage-conflict').count()).toBe(1);
  const p = await savedProject(page);
  expect(p.workPlan!.baselines).toHaveLength(1);
  expect(p.workPlan!.notifications).toHaveLength(2);
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), PROJECT_KEY);
  expect(stored.saveVersion).toBeTruthy();
  expect(stored.format).toBe('kubangun-storage-v1');
});