import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';
import { mockBackend, login, users } from './mockBackend';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Global' });

async function registerDiner(page: Page) {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();
  return email;
}

async function editUser(page: Page, fields: { name?: string; email?: string; password?: string }) {
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  const textboxes = page.getByRole('dialog').getByRole('textbox');
  if (fields.name !== undefined) await textboxes.nth(0).fill(fields.name);
  if (fields.email !== undefined) await textboxes.nth(1).fill(fields.email);
  if (fields.password !== undefined) await textboxes.nth(2).fill(fields.password);
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
}

async function relogin(page: Page, email: string, password: string) {
  await nav(page).getByRole('link', { name: 'Logout' }).click();
  await login(page, { ...users.diner, email, password });
}

test('updateUser', async ({ page }) => {
  await mockBackend(page);
  const email = await registerDiner(page);

  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza diner');

  // Updating without changing anything keeps the user the same
  await editUser(page, {});
  await expect(page.getByRole('main')).toContainText('pizza diner');

  await editUser(page, { name: 'pizza dinerx' });
  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await relogin(page, email, 'diner');
  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

test('update password', async ({ page }) => {
  await mockBackend(page);
  const email = await registerDiner(page);
  await page.getByRole('link', { name: 'pd' }).click();

  await editUser(page, { password: 'newpassword' });

  await nav(page).getByRole('link', { name: 'Logout' }).click();
  await login(page, { ...users.diner, email, password: 'diner' });
  await expect(page.getByText('unknown user')).toBeVisible();

  await page.getByPlaceholder('Password').fill('newpassword');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'pd' })).toBeVisible();
});

test('update email', async ({ page }) => {
  await mockBackend(page);
  const oldEmail = await registerDiner(page);
  const newEmail = `new${oldEmail}`;
  await page.getByRole('link', { name: 'pd' }).click();

  await editUser(page, { email: newEmail });
  await expect(page.getByRole('main')).toContainText(newEmail);

  await nav(page).getByRole('link', { name: 'Logout' }).click();
  await login(page, { ...users.diner, email: oldEmail, password: 'diner' });
  await expect(page.getByText('unknown user')).toBeVisible();

  await page.getByPlaceholder('Email address').fill(newEmail);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText(newEmail);
});

test('franchisee updates their info', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await login(page, users.franchisee);
  await page.getByRole('link', { name: 'F', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Franchisee on 2');

  await editUser(page, { name: 'Franklin' });
  await expect(page.getByRole('main')).toContainText('Franklin');
  await expect(page.getByRole('main')).toContainText('Franchisee on 2');

  await relogin(page, users.franchisee.email, users.franchisee.password);
  await page.getByRole('link', { name: 'F', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Franklin');
  await expect(page.getByRole('main')).toContainText('Franchisee on 2');
});

test('admin updates their info', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await login(page, users.admin);
  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole('main')).toContainText('admin');

  await editUser(page, { name: 'Pizza Admin', email: 'admin2@jwt.com' });
  await expect(page.getByRole('main')).toContainText('Pizza Admin');
  await expect(page.getByRole('main')).toContainText('admin2@jwt.com');

  await relogin(page, 'admin2@jwt.com', users.admin.password);
  await page.getByRole('link', { name: 'PA' }).click();
  await expect(page.getByRole('main')).toContainText('Pizza Admin');
  await expect(page.getByRole('main')).toContainText('admin');
});

test('admin lists and filters users', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.admin });
  await page.goto('/admin-dashboard');

  await expect(page.getByRole('row', { name: /d@jwt.com/ })).toContainText('Kai Chen');
  await expect(page.getByRole('row', { name: /f@jwt.com/ })).toContainText('franchisee');
  await expect(page.getByRole('row', { name: /a@jwt.com/ })).toContainText('admin');

  await page.getByPlaceholder('Filter users').fill('kai');
  await page.getByRole('button', { name: 'Filter users' }).click();
  await expect(page.getByRole('row', { name: /d@jwt.com/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /f@jwt.com/ })).toHaveCount(0);
  await expect(page.getByRole('row', { name: /a@jwt.com/ })).toHaveCount(0);
});

test('admin paginates users', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.admin, extraUsers: 12 });
  await page.goto('/admin-dashboard');

  await expect(page.getByRole('row', { name: /diner7@jwt.com/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /diner12@jwt.com/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Previous users page' })).toBeDisabled();

  await page.getByRole('button', { name: 'Next users page' }).click();
  await expect(page.getByRole('row', { name: /diner12@jwt.com/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /diner7@jwt.com/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next users page' })).toBeDisabled();

  await page.getByRole('button', { name: 'Previous users page' }).click();
  await expect(page.getByRole('row', { name: /diner7@jwt.com/ })).toBeVisible();
});

test('admin deletes a user', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await login(page, users.admin);
  await nav(page).getByRole('link', { name: 'Admin' }).click();

  await page.getByRole('row', { name: /d@jwt.com/ }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Are you sure you want to delete Kai Chen?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('row', { name: /d@jwt.com/ })).toBeVisible();

  await page.getByRole('row', { name: /d@jwt.com/ }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible();
  await expect(page.getByRole('row', { name: /d@jwt.com/ })).toHaveCount(0);

  // The deleted user can no longer log in
  await nav(page).getByRole('link', { name: 'Logout' }).click();
  await login(page, users.diner);
  await expect(page.getByText('unknown user')).toBeVisible();
});

test('edit user validates name and email', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.diner });
  await page.goto('/');
  await page.getByRole('link', { name: 'KC' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  const dialog = page.getByRole('dialog');
  const update = dialog.getByRole('button', { name: 'Update' });

  await dialog.getByRole('textbox', { name: 'Email' }).fill('not-an-email');
  await expect(dialog.getByRole('alert')).toHaveText('Enter a valid email address');
  await expect(update).toBeDisabled();

  await dialog.getByRole('textbox', { name: 'Email' }).fill('kai@jwt.com');
  await dialog.getByRole('textbox', { name: 'Name' }).fill('   ');
  await expect(dialog.getByRole('alert')).toHaveText('Name is required');
  await expect(update).toBeDisabled();

  await dialog.getByRole('textbox', { name: 'Name' }).fill('Kai');
  await expect(dialog.getByRole('alert')).toHaveText('');
  await expect(update).toBeEnabled();
});

test('edit user shows an error when the update fails', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.diner, updateUserFails: true });
  await page.goto('/');
  await page.getByRole('link', { name: 'KC' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name' }).fill('Kai Changed');
  await dialog.getByRole('button', { name: 'Update' }).click();

  await expect(dialog.getByRole('alert')).toHaveText('Unable to update user: unable to update user');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).not.toContainText('Kai Changed');

  // Reopening the editor clears the old error and resets the fields
  await dialog.getByRole('button').first().click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('');
  await expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Kai Chen');
});

test('admin sees an error when deleting a user fails', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.admin, deleteUserFails: true });
  await page.goto('/admin-dashboard');

  await page.getByRole('row', { name: /d@jwt.com/ }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('alert')).toHaveText('Unable to delete user: unable to delete user');

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('row', { name: /d@jwt.com/ })).toBeVisible();
});

test('admin filtering users from a later page starts on the first page', async ({ page }) => {
  await mockBackend(page, { loggedInAs: users.admin, extraUsers: 12 });
  await page.goto('/admin-dashboard');

  await page.getByRole('button', { name: 'Next users page' }).click();
  await expect(page.getByRole('row', { name: /diner12@jwt.com/ })).toBeVisible();

  await page.getByPlaceholder('Filter users').fill('Diner 1');
  await page.getByRole('button', { name: 'Filter users' }).click();
  await expect(page.getByRole('row', { name: /diner1@jwt.com/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous users page' })).toBeDisabled();
});
