# Sprint 0 — Fundação

## Objetivo

Entregar uma base reproduzível para iniciar autenticação e painel na Sprint 1 sem retrabalho estrutural.

## Checklist

- [x] Workspace pnpm e pipeline Turborepo.
- [x] Aplicação web Next.js.
- [x] API NestJS com Fastify e healthcheck.
- [x] Worker NestJS com Redis/BullMQ.
- [x] PostgreSQL, Redis e healthchecks em Docker Compose.
- [x] Schema inicial Prisma multi-tenant.
- [x] Contratos Zod centrais.
- [x] Interface de adapters de gateway.
- [x] Design tokens e componentes iniciais.
- [x] ESLint, Prettier e TypeScript estrito.
- [x] Testes unitários e smoke test Playwright.
- [x] CI para lint, tipos, testes, build e smoke test.
- [x] Dependências instaladas e lockfile gerado.
- [x] Migration inicial aplicada em PostgreSQL local.
- [x] Todos os checks executados com sucesso.

## Critérios de aceite

- `pnpm dev` inicia os três processos.
- web responde em `/api/health`.
- API responde em `/v1/health`.
- migrations criam o banco a partir do zero.
- `pnpm check` termina sem erros.
- smoke test abre a página de fundação e identifica a Sprint 0.
