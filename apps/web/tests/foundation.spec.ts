import { expect, test, type Page } from '@playwright/test';

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function register(page: Page, input: { email: string; name: string; workspace: string }) {
  await page.goto('/cadastro');
  await page.getByLabel('Seu nome').fill(input.name);
  await page.getByLabel('Nome do negócio').fill(input.workspace);
  await page.getByLabel('E-mail').fill(input.email);
  await page.getByLabel('Senha', { exact: true }).fill('checkout123');
  await page.getByRole('button', { name: 'Criar conta gratuita' }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test('creates isolated workspaces and navigates through the protected panel', async ({
  browser,
  page,
}) => {
  const firstEmail = uniqueEmail('tenant-a');
  await page.goto('/');
  await expect(page).toHaveURL(/\/entrar$/);
  await register(page, {
    email: firstEmail,
    name: 'Maria Operadora',
    workspace: 'Loja Aurora',
  });

  await expect(page.getByRole('heading', { name: 'Bom trabalho, Maria.' })).toBeVisible();
  const desktopSidebar = page.locator('.desktop-sidebar');
  await expect(desktopSidebar.getByText('Loja Aurora')).toBeVisible();
  await desktopSidebar.getByRole('link', { name: 'Produtos' }).click();
  await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();

  const firstViewer = await page.evaluate(async () =>
    fetch('/api/backend/auth/me').then((response) => response.json()),
  );

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await register(secondPage, {
    email: uniqueEmail('tenant-b'),
    name: 'João Gestor',
    workspace: 'Negócio Horizonte',
  });
  const secondViewer = await secondPage.evaluate(async () =>
    fetch('/api/backend/auth/me').then((response) => response.json()),
  );

  expect(firstViewer.workspace.id).not.toBe(secondViewer.workspace.id);
  expect(firstViewer.workspace.name).toBe('Loja Aurora');
  expect(secondViewer.workspace.name).toBe('Negócio Horizonte');
  await secondContext.close();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});

test('recovers the password with a single-use development link', async ({ page }) => {
  const email = uniqueEmail('recovery');
  await register(page, {
    email,
    name: 'Ana Financeiro',
    workspace: 'Ana Digital',
  });
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto('/recuperar-senha');
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Gerar link de recuperação' }).click();
  await page.getByRole('link', { name: /Abrir link local/ }).click();
  await page.getByLabel('Nova senha', { exact: true }).fill('checkout456');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByText('Senha redefinida.')).toBeVisible();
  await page.getByRole('link', { name: 'Voltar para o login' }).click();
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('checkout456');
  await page.getByRole('button', { name: 'Entrar na plataforma' }).click();
  await expect(page).toHaveURL(/\/app$/);
});
