import { test, expect } from '@playwright/test';

test('language switches immediately, persists, and does not discard form drafts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bukti sebelum bangun' })).toBeVisible();
  await page.getByTestId('select-language').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Evidence before construction' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('link-nav-pengaturan')).toHaveText('Settings');
  await page.getByTestId('link-create-project').click();
  await page.getByTestId('input-name').fill('Draf');
  await page.getByTestId('input-city').fill('Simpan');
  await page.getByTestId('select-province').selectOption('DKI Jakarta');
  await page.getByTestId('select-language').selectOption('id');
  await expect(page.getByTestId('input-name')).toHaveValue('Draf');
  await expect(page.getByTestId('input-city')).toHaveValue('Simpan');
  await expect(page.getByTestId('select-province')).toHaveValue('DKI Jakarta');
  await page.getByTestId('select-language').selectOption('en');
  await page.getByTestId('button-create').click();
  await expect(page.getByTestId('text-project-name')).toHaveText('Draf');
  await expect(page.getByTestId('tab-ruang')).toHaveText('Rooms & Components');
  await page.reload();
  await expect(page.getByTestId('select-language')).toHaveValue('en');
  await expect(page.getByTestId('text-project-name')).toHaveText('Draf');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('English forms keep canonical option values and translate validation and reports', async ({ page }) => {
  await page.goto('/projects/new');
  await page.getByTestId('select-language').selectOption('en');
  await page.getByTestId('button-create').click();
  await expect(page.getByText('Project name is required.', { exact: true })).toBeVisible();
  await page.getByTestId('input-name').fill('Bilingual test');
  await page.getByTestId('input-city').fill('Jakarta');
  await page.getByTestId('select-province').selectOption('DKI Jakarta');
  await page.getByTestId('button-create').click();
  await page.getByTestId('tab-ruang').click();
  await page.getByTestId('button-add-component').click();
  const wall = page.locator('option').filter({ hasText: /^Wall$/ });
  await expect(wall).toHaveAttribute('value', 'Dinding');
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Add component');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByTestId('tab-laporan').click();
  await expect(page.getByText('Preliminary / draft report. Not a professional review, certificate, or permit.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('button-print')).toHaveText('Print / Save PDF');
});

test('mobile language control is accessible without opening the menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('select-language-mobile').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Evidence before construction' })).toBeVisible();
  await page.getByTestId('button-menu').click();
  await expect(page.getByTestId('link-nav-pengaturan').last()).toHaveText('Settings');
  await page.getByTestId('select-language').last().selectOption('id');
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
});

test('language follows other tabs without rewriting project data', async ({ page, context }) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/settings');
  const before = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key !== 'kubangun.language.v1'));
  await page.getByTestId('select-language').selectOption('en');
  await expect(other.locator('html')).toHaveAttribute('lang', 'en');
  await expect(other.getByTestId('select-language').last()).toHaveValue('en');
  const after = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key !== 'kubangun.language.v1'));
  expect(after).toEqual(before);
  await other.close();
});

test('a blocked language preference reports session-only persistence', async ({ page }) => {
  await page.addInitScript(() => {
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'kubangun.language.v1') throw new DOMException('Blocked', 'SecurityError');
      return save.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByTestId('select-language').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('status').filter({ hasText: 'applies only to this session' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
});