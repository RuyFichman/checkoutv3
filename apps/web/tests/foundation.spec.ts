import { expect, test } from '@playwright/test';

test('shows the Sprint 0 foundation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('base do novo checkout');
  await expect(page.getByText('Sprint 0 ativa')).toBeVisible();
});
