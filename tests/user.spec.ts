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
