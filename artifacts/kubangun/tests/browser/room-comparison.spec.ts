import {
  test, expect, fixtureProject, openRooms, savedProject, expectMutation,
  requestReview, addRoom,
} from './fixtures';

test('legacy measurements stay unclassified until explicitly chosen; evidence survives reload', async ({ page }) => {
  await openRooms(page);
  await expect(page.getByTestId('room-previews-unknown')).toContainText('Eksisting lama');
  await expect(page.getByTestId('room-previews-total-unknown')).toContainText('1 ruang / 12 m²');
  await expect(page.getByTestId('room-previews-total-existing')).toContainText('0 ruang');
  await expect(page.getByTestId('room-previews-total-proposed')).toContainText('0 ruang');
  await expect(page.locator('[data-testid^="room-previews-difference-"]')).toHaveCount(0);
  expect((await savedProject(page)).revision).toBe(7);
  await page.reload();
  await expect(page.getByTestId('room-previews-unknown')).toBeVisible();

  await page.getByTestId('row-room-legacy').getByRole('button', { name: 'Ubah', exact: true }).click();
  await expect(page.getByTestId('select-room-state')).toHaveValue('unknown');
  await expect(page.getByTestId('input-room-length')).toHaveValue('3');
  await expect(page.getByTestId('select-room-doc')).toHaveValue('evidence');
  await page.getByTestId('select-room-state').selectOption('existing');
  await expect(page.getByTestId('check-room-confirmed')).not.toBeChecked();
  await page.getByTestId('button-save-room').click();
  await expectMutation(page, 8);
  await expect(page.getByTestId('room-previews-unknown')).toHaveCount(0);
  await expect(page.getByTestId('room-previews-total-existing')).toContainText('1 ruang / 12 m²');
  await expect(page.locator('[data-testid^="room-previews-difference-"]'))
    .toHaveText('Selisih belum tersedia: diperlukan pasangan dengan ukuran valid pada kedua keadaan.');
  await page.reload();
  await expectMutation(page, 8);
  expect((await savedProject(page)).rooms[0]).toEqual({
    ...fixtureProject().rooms[0], state: 'existing', confirmed: false,
  });
  await expect(page.getByTestId('row-room-legacy')).toContainText('Existing survey.pdf');
});

test('create, link, edit and delete persist and each resets review to draft with one revision', async ({ page }) => {
  await openRooms(page);
  const existingId = await addRoom(page, 'Existing test room', 'existing');
  await expectMutation(page, 8);
  await requestReview(page, 8);
  const proposedId = await addRoom(page, 'Proposed test room', 'proposed');
  await expectMutation(page, 9);
  // Same dimensions do not automatically pair rooms.
  expect((await savedProject(page)).rooms.find((r) => r.id === proposedId)?.existingRoomId).toBeUndefined();
  await expect(page.locator('[data-testid^="room-previews-difference-"]').filter({ hasText: 'Selisih 0' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId(`row-room-${proposedId}`)).toBeVisible();
  await expectMutation(page, 9);

  await requestReview(page, 9);
  await page.getByTestId(`row-room-${proposedId}`).getByRole('button', { name: 'Ubah', exact: true }).click();
  await page.getByTestId('select-room-existing').selectOption(existingId);
  await page.getByTestId('button-save-room').click();
  await expectMutation(page, 10);
  const difference = page.locator('[data-testid^="room-previews-difference-"]').filter({ hasText: 'Eksisting 20' });
  await expect(difference).toHaveText('Eksisting 20 m² / Usulan 20 m² / Selisih 0 m² (0%)');
  await page.reload();
  await expect(difference).toBeVisible();
  expect((await savedProject(page)).rooms.find((r) => r.id === proposedId)?.existingRoomId).toBe(existingId);

  await requestReview(page, 10);
  await page.getByTestId(`row-room-${proposedId}`).getByRole('button', { name: 'Ubah', exact: true }).click();
  await expect(page.getByTestId('select-room-existing')).toHaveValue(existingId);
  await page.getByTestId('input-room-length').fill('6');
  await page.getByTestId('check-room-confirmed').check();
  await page.getByTestId('button-save-room').click();
  await expectMutation(page, 11);
  await expect(difference).toHaveText('Eksisting 20 m² / Usulan 24 m² / Selisih +4 m² (+20%)');
  await expect(page.getByTestId('room-previews-total-existing')).toContainText('1 ruang / 20 m²');
  await expect(page.getByTestId('room-previews-total-proposed')).toContainText('1 ruang / 24 m²');
  await page.reload();
  await expect(difference).toContainText('Selisih +4');
  await expectMutation(page, 11);
  expect((await savedProject(page)).rooms.find((r) => r.id === proposedId)).toMatchObject({
    length: 6, width: 4, confirmed: true, existingRoomId: existingId,
  });

  await requestReview(page, 11);
  await page.getByTestId(`row-room-${existingId}`).getByRole('button', { name: 'Hapus', exact: true }).click();
  await page.getByTestId('button-confirm').click();
  await expectMutation(page, 12);
  await expect(page.getByTestId(`row-room-${existingId}`)).toHaveCount(0);
  await expect(page.getByTestId(`row-room-${proposedId}`)).not.toContainText('pasangan:');
  await expect(page.locator('[data-testid^="room-previews-difference-"]')).toContainText('Selisih belum tersedia');
  await page.reload();
  await expectMutation(page, 12);
  expect((await savedProject(page)).rooms.find((r) => r.id === proposedId)?.existingRoomId).toBeUndefined();
  await expect(page.getByTestId('room-previews-total-existing')).toContainText('0 ruang');

  await requestReview(page, 12);
  await page.getByTestId(`row-room-${proposedId}`).getByRole('button', { name: 'Hapus', exact: true }).click();
  await page.getByTestId('button-confirm').click();
  await expectMutation(page, 13);
  await page.reload();
  await expect(page.getByTestId(`row-room-${proposedId}`)).toHaveCount(0);
  await expectMutation(page, 13);
  expect((await savedProject(page)).rooms.map((r) => r.id)).toEqual(['legacy']);
});

test('validation and cancellation do not save; occupied links are disabled and reclassification clears them', async ({ page }) => {
  await openRooms(page);
  await page.getByTestId('button-add-room').click();
  await page.getByTestId('input-room-name').fill('Unsaved');
  await page.getByTestId('input-room-length').fill('5');
  await page.getByTestId('input-room-width').fill('4');
  await page.getByTestId('button-save-room').click();
  await expect(page.getByRole('alert')).toHaveText('Pilih keadaan ruang: eksisting atau usulan.');
  expect(await savedProject(page)).toEqual(fixtureProject());
  await page.getByRole('dialog').getByRole('button', { name: 'Batal', exact: true }).click();
  const existingId = await addRoom(page, 'Existing', 'existing');
  const proposedId = await addRoom(page, 'Proposed', 'proposed');
  await page.getByTestId(`row-room-${proposedId}`).getByRole('button', { name: 'Ubah', exact: true }).click();
  await page.getByTestId('select-room-existing').selectOption(existingId);
  await page.getByTestId('button-save-room').click();
  await page.getByTestId('button-add-room').click();
  await page.getByTestId('select-room-state').selectOption('proposed');
  // Playwright's enabled matcher does not cover native <option> elements.
  await expect(page.getByTestId('select-room-existing').locator(`option[value="${existingId}"]`)).toHaveAttribute('disabled', '');
  await page.getByRole('dialog').getByRole('button', { name: 'Batal', exact: true }).click();
  await requestReview(page, 10);
  const beforeCancel = await savedProject(page);
  await page.getByTestId(`row-room-${existingId}`).getByRole('button', { name: 'Hapus', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Batal', exact: true }).click();
  expect(await savedProject(page)).toEqual(beforeCancel);
  await page.getByTestId(`row-room-${existingId}`).getByRole('button', { name: 'Ubah', exact: true }).click();
  await page.getByTestId('select-room-state').selectOption('proposed');
  await page.getByTestId('button-save-room').click();
  await expectMutation(page, 11);
  expect((await savedProject(page)).rooms.find((r) => r.id === proposedId)?.existingRoomId).toBeUndefined();
  await page.reload();
  await expectMutation(page, 11);
  await expect(page.getByTestId('room-previews-total-existing')).toContainText('0 ruang');
  await expect(page.getByTestId(`row-room-${proposedId}`)).not.toContainText('pasangan:');
});