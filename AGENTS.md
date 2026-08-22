# Guia de agentes — CheckoutV3

## Contexto obrigatório

O CheckoutV3 é uma plataforma própria de checkout e orquestração de pagamentos inspirada apenas nos fluxos de mercado observados nas referências. Não copie marca, logotipo, textos, imagens ou outros ativos proprietários da EzFy.

Antes de alterar comportamento ou arquitetura, leia:

- `README.md` para execução local e estado atual;
- `docs/ARCHITECTURE.md` para limites e decisões técnicas;
- `docs/PRODUCT_PLAN.md` para sequência das sprints;
- `docs/SPRINT_1.md` para os fluxos já entregues;
- `docs/SPRINT_2.md` para catálogo, temas e checkout público;
- o `AGENTS.md` mais próximo do arquivo alterado, quando existir.

As Sprints 0, 1, 2 e 3 estão concluídas. A Sprint 2 foi publicada em `origin/main` no commit `9cca9e5`; a Sprint 3 está concluída localmente e ainda não foi publicada. O próximo escopo planejado é a Sprint 4: primeiro gateway real. Não antecipe módulos de sprints futuras sem solicitação explícita.

## Stack vigente

- Monorepo pnpm 10 com Turborepo e TypeScript estrito.
- Web: Next.js 16 App Router, React 19 e Lucide React.
- API: NestJS 11, Fastify 5, Zod 4 e cookie Fastify.
- Banco: PostgreSQL, Prisma 7 e migrations versionadas.
- Assíncrono: Redis, BullMQ e worker NestJS.
- Testes: Vitest para unidades e Playwright para fluxos E2E.

Não substitua essa stack ou introduza um segundo framework para resolver uma tarefa local.

## Organização do monorepo

- `apps/web`: painel, autenticação e futuras páginas públicas de checkout.
- `apps/api`: autoridade de sessão, regras de negócio e endpoints HTTP.
- `apps/worker`: filas, webhooks, e-mails e retentativas.
- `packages/contracts`: schemas Zod e tipos compartilhados entre processos.
- `packages/db`: schema, migrations e cliente Prisma.
- `packages/gateways`: contrato único dos adaptadores de pagamento.
- `packages/ui`: tokens e componentes reutilizáveis.

Contratos compartilhados pertencem a `packages/contracts`; não duplique DTOs incompatíveis nos apps. Alterações persistentes exigem migration em `packages/db/prisma/migrations`.

## Regras de domínio e segurança

- Toda entidade operacional deve ser isolada por `workspaceId`.
- O tenant vem da sessão autenticada no servidor, nunca de um identificador confiado do cliente.
- Consultas multi-tenant devem usar o escopo do `TenantScopeService` ou restrição equivalente explícita.
- Valores monetários são inteiros em centavos; nunca use ponto flutuante para dinheiro.
- A API é a autoridade de autenticação. O navegador não deve receber nem persistir tokens de sessão em JavaScript.
- Sessões usam tokens opacos; somente hashes ficam no banco. Cookies permanecem `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Senhas usam `scrypt` com salt único. Recuperação é genérica, temporária, de uso único e revoga sessões anteriores.
- Operações administrativas respeitam os papéis `OWNER`, `ADMIN` e `MEMBER` e geram auditoria quando relevante.
- Credenciais de gateway devem ser criptografadas antes da persistência. Dados completos de cartão nunca passam pelos nossos servidores.
- Webhooks e transições financeiras precisam ser idempotentes, verificáveis e auditáveis.

## Regras para o app web

- O Next.js instalado pode divergir do conhecimento prévio do agente. Leia o guia relevante em `apps/web/node_modules/next/dist/docs/` antes de editar APIs ou convenções do framework.
- Mantenha a proteção de rotas no servidor por meio de `apps/web/src/lib/api.ts` e dos layouts do App Router.
- O cliente acessa a API pelo BFF allowlisted em `apps/web/app/api/backend/[...path]/route.ts`; não crie proxies genéricos nem exponha a URL interna.
- Preserve estados de loading, vazio, erro, sucesso e permissão em cada fluxo alterado.
- Toda interface deve funcionar em desktop e mobile, ter foco visível, labels acessíveis e navegação por teclado.
- Use Lucide para ícones de interface. Não crie SVGs avulsos quando um ícone do sistema já atende.
- Mantenha a identidade própria: fundo quase preto, violeta como ação principal, contraste alto e superfícies contidas.

## Fluxo de desenvolvimento

Primeira execução local:

```bash
pnpm install
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Validação mínima antes de entregar mudanças:

```bash
pnpm format:check
pnpm check
```

Execute também `pnpm test:e2e` quando alterar autenticação, sessão, navegação, BFF, dashboard ou um caminho crítico. Após mudanças de schema, confirme `pnpm --filter @checkout/db exec prisma migrate status`.

Não marque uma sprint ou tarefa como concluída enquanto lint, tipos, testes e build não estiverem aprovados. Atualize a documentação da sprint quando critérios de aceite ou decisões duráveis mudarem.

## Estado local conhecido

- Serviços: web `:3000`, API `:3333`, PostgreSQL `:55432` e Redis `:56379`.
- A recuperação de senha mostra o link somente em desenvolvimento; produção deverá entregá-lo pelo provedor de e-mail.
- Nenhum gateway real está conectado e nenhuma transação financeira real é processada.
- O social preview oficial atual é `apps/web/public/og-checkoutv3.png`.
- A Sprint 2 aceita PNG, JPEG ou WebP de até 1 MB como data URL persistida; migre os blobs para storage S3 compatível antes de produção.
