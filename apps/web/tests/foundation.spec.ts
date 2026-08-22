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

test('creates a theme, publishes a product and opens an isolated public checkout', async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const workspace = `Estúdio Catálogo ${suffix.slice(-5)}`;
  const themeName = `Tema Violeta ${suffix.slice(-5)}`;
  const productName = `Curso Catálogo ${suffix.slice(-5)}`;

  await register(page, {
    email: uniqueEmail('catalog-owner'),
    name: 'Clara Catálogo',
    workspace,
  });

  const desktopSidebar = page.locator('.desktop-sidebar');
  await desktopSidebar.getByRole('link', { name: 'Temas' }).click();
  await page.locator('.page-heading').getByRole('button', { name: 'Criar tema' }).click();
  await page.getByLabel('Nome interno do tema').fill(themeName);
  await page.getByLabel('Nome exibido no checkout').fill(workspace);
  await page.getByRole('button', { name: 'Salvar tema' }).click();
  await expect(page.getByText('Tema salvo e pronto para vincular a produtos.')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();

  await desktopSidebar.getByRole('link', { name: 'Produtos' }).click();
  await page.locator('.page-heading').getByRole('button', { name: 'Criar produto' }).click();
  await page.getByLabel('Nome do produto').fill(productName);
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.getByLabel('Preço de venda').fill('129.90');
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.getByRole('button', { name: new RegExp(themeName) }).click();
  await page.getByRole('button', { name: 'Publicar checkout' }).click();

  const checkoutLink = page.getByRole('link', { name: 'Abrir checkout' });
  await expect(checkoutLink).toBeVisible();
  const checkoutPath = await checkoutLink.getAttribute('href');
  expect(checkoutPath).toMatch(/^\/c\//);

  const anonymousContext = await browser.newContext();
  const publicPage = await anonymousContext.newPage();
  await publicPage.goto(checkoutPath!);
  await expect(publicPage.getByRole('heading', { name: 'Finalize seu pedido' })).toBeVisible();
  await expect(publicPage.getByText(productName, { exact: true })).toBeVisible();
  await expect(publicPage.getByText(workspace)).toBeVisible();
  await publicPage.getByLabel('Nome completo').fill('Comprador Teste');
  await publicPage.getByLabel('E-mail de entrega').fill('comprador@example.com');
  await publicPage.getByRole('button', { name: 'Continuar para o resumo' }).click();
  await expect(
    publicPage.getByRole('heading', { name: 'Confira antes de gerar o PIX' }),
  ).toBeVisible();
  await publicPage.getByRole('button', { name: 'Gerar PIX' }).click();
  await expect(publicPage.getByRole('heading', { name: 'PIX gerado com sucesso' })).toBeVisible();
  await expect(publicPage.getByText(/Pedido C3-/)).toBeVisible();
  await publicPage.getByRole('button', { name: 'Copiar código PIX' }).click();
  await expect(publicPage.getByText('Código PIX copiado.')).toBeVisible();
  await publicPage.locator('input[type="file"]').setInputFiles({
    name: 'comprovante.png',
    mimeType: 'image/png',
    buffer: Buffer.from('comprovante-simulado'),
  });
  await expect(publicPage.getByText('Comprovante anexado ao pedido.')).toBeVisible();
  await publicPage.getByRole('button', { name: 'Simular pagamento aprovado' }).click();
  await expect(publicPage.getByRole('heading', { name: 'Pedido aprovado!' })).toBeVisible();
  await anonymousContext.close();

  await desktopSidebar.getByRole('link', { name: 'Pedidos' }).click();
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
  await expect(page.getByText(productName, { exact: true })).toBeVisible();
  await expect(page.getByText('Comprador Teste', { exact: true })).toBeVisible();
  await expect(page.getByText('Pago', { exact: true })).toBeVisible();
  await expect(page.getByText('Comprovante anexado', { exact: true })).toBeVisible();

  const isolatedContext = await browser.newContext();
  const isolatedPage = await isolatedContext.newPage();
  await register(isolatedPage, {
    email: uniqueEmail('catalog-isolated'),
    name: 'Outro Vendedor',
    workspace: `Outro Workspace ${suffix.slice(-5)}`,
  });
  const isolatedCatalog = await isolatedPage.evaluate(async () =>
    fetch('/api/backend/products').then((response) => response.json()),
  );
  expect(isolatedCatalog.products).toEqual([]);
  const isolatedOrders = await isolatedPage.evaluate(async () =>
    fetch('/api/backend/orders').then((response) => response.json()),
  );
  expect(isolatedOrders.orders).toEqual([]);
  await isolatedContext.close();
});
