# CheckoutV3

Fundação de uma plataforma multi-tenant de checkout e orquestração de pagamentos. O projeto está em desenvolvimento incremental conforme o plano em [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md).

## Estado atual

A Sprint 0 entrega:

- monorepo com painel web, API e worker;
- contratos compartilhados de domínio;
- interface comum para adaptadores de gateway;
- schema inicial PostgreSQL com Prisma;
- Redis e BullMQ para trabalho assíncrono;
- design tokens e componentes de UI iniciais;
- lint, tipos, testes, build e CI;
- healthchecks para web e API.

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
pnpm infra:down     # encerra PostgreSQL e Redis
```

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
