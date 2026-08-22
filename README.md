# CheckoutV3

Fundação de uma plataforma multi-tenant de checkout e orquestração de pagamentos. O projeto está em desenvolvimento incremental conforme o plano em [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md).

## Estado atual

As Sprints 0 e 1 entregam:

- monorepo com painel web, API e worker;
- cadastro, login, logout e recuperação de senha;
- sessões opacas persistidas com cookie seguro;
- workspaces multi-tenant, perfil do vendedor e papéis de acesso;
- dashboard responsivo, navegação completa e estados de loading, vazio e erro;
- métricas isoladas por workspace e modo de demonstração;
- configurações de perfil/workspace e trilha de auditoria;
- PostgreSQL com Prisma, Redis/BullMQ e pipeline de migrations;
- lint, tipos, testes unitários, build, E2E e CI.

Nenhum gateway real está conectado nesta fase e nenhuma transação financeira é processada.

## Requisitos

- Node.js 20.9 ou superior (recomendado: 24 LTS)
- pnpm 10 ou superior
- Docker com Docker Compose

## Primeira execução

```bash
pnpm install
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Serviços locais:

- web: `http://localhost:3000`
- cadastro: `http://localhost:3000/cadastro`
- login: `http://localhost:3000/entrar`
- painel autenticado: `http://localhost:3000/app`
- healthcheck web: `http://localhost:3000/api/health`
- healthcheck API: `http://localhost:3333/v1/health`
- PostgreSQL: `localhost:55432`
- Redis: `localhost:56379`

Copie `.env.example` para `.env` quando precisar recriar o ambiente. As credenciais incluídas são exclusivas para desenvolvimento local.

## Comandos principais

```bash
pnpm dev            # executa web, API e worker
pnpm build          # compila todo o monorepo
pnpm lint           # executa análise estática
pnpm typecheck      # valida tipos TypeScript
pnpm test           # executa testes unitários
pnpm test:e2e       # executa o smoke test no navegador
pnpm check          # lint + tipos + testes + build
pnpm db:deploy      # aplica migrations pendentes sem criar uma nova migration
pnpm infra:down     # encerra PostgreSQL e Redis
```

Em desenvolvimento, a recuperação de senha exibe o link de redefinição na própria tela. Em produção, o mesmo token deve ser entregue pelo provedor de e-mail; ele nunca é devolvido pela API nesse ambiente.

## Estrutura

```text
apps/
  web/       painel, checkout público e landing page
  api/       regras transacionais e integrações HTTP
  worker/    filas, webhooks, e-mails e retentativas

packages/
  config/    configurações compartilhadas
  contracts/ schemas Zod e tipos de domínio
  db/        Prisma, schema e migrations PostgreSQL
  gateways/  contrato dos adaptadores de pagamento
  ui/        tokens e componentes visuais
```

## Princípios de segurança

- isolamento por workspace em todas as entidades operacionais;
- valores monetários representados como inteiros em centavos;
- credenciais de gateway sempre criptografadas antes da persistência;
- eventos e alterações financeiras auditáveis;
- webhooks idempotentes e verificáveis;
- nenhum dado sensível de cartão passa pelos nossos servidores.

Veja as decisões arquiteturais em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
O escopo e os aceites da entrega atual estão em [`docs/SPRINT_1.md`](docs/SPRINT_1.md).
