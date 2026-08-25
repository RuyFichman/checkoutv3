# Guia de agentes — CheckoutV3

## Contexto obrigatório

O CheckoutV3 é uma plataforma própria de checkout e orquestração de pagamentos inspirada apenas nos fluxos de mercado observados nas referências. Não copie marca, logotipo, textos, imagens ou outros ativos proprietários da EzFy.

Antes de alterar comportamento ou arquitetura, leia:

- `README.md` para execução local e estado atual;
- `docs/ARCHITECTURE.md` para limites e decisões técnicas;
- `docs/PRODUCT_PLAN.md` para sequência das sprints;
- `docs/SPRINT_1.md` para os fluxos já entregues;
- `docs/SPRINT_2.md` para catálogo, temas e checkout público;
- `docs/SPRINT_3.md` para checkout transacional simulado e pedidos;
- `docs/SPRINT_4.md` para o primeiro gateway real e as pendências de homologação;
- o `AGENTS.md` mais próximo do arquivo alterado, quando existir.

As Sprints 0, 1, 2 e 3 estão concluídas. A Sprint 2 foi publicada em `origin/main` no commit `9cca9e5`, e a Sprint 3 foi publicada no commit `4dc6f93`. A Sprint 4 está em andamento: o adapter PIX do Mercado Pago foi implementado e está pronto para homologação, mas ainda não foi validado com credenciais de teste nem publicado. A Flevo permanece como gateway posterior, aguardando retorno comercial/técnico. Não antecipe módulos de sprints futuras sem solicitação explícita.

O CheckoutV3 é exclusivamente PIX. Não introduza campos, contratos, modelos, SDKs, scripts, endpoints ou adapters para cartão. Uma futura mudança dessa decisão exige revisão arquitetural e de conformidade explícita antes de qualquer implementação.

## Stack vigente

- Monorepo pnpm 10 com Turborepo e TypeScript estrito.
- Web: Next.js 16 App Router, React 19 e Lucide React.
- API: NestJS 11, Fastify 5, Zod 4 e cookie Fastify.
- Banco: PostgreSQL, Prisma 7 e migrations versionadas.
- Assíncrono: Redis, BullMQ e worker NestJS.
- Testes: Vitest para unidades e Playwright para fluxos E2E.

Não substitua essa stack ou introduza um segundo framework para resolver uma tarefa local.

## Organização do monorepo

- `apps/web`: painel, autenticação e checkout público.
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
- Credenciais de gateway devem ser criptografadas antes da persistência. Nenhum dado ou fluxo de cartão pertence ao escopo do produto.
- Webhooks e transições financeiras precisam ser idempotentes, verificáveis e auditáveis.

## Estado e regras da Sprint 4

- O primeiro gateway real escolhido é o Mercado Pago, usando a Orders API em `/v1/orders`; não use a Payments API legada para este fluxo.
- A integração cria exclusivamente pagamentos `pix` do tipo `bank_transfer`, com valores convertidos de centavos inteiros para strings decimais exatas.
- O ID local do pagamento é a `external_reference` e a chave de idempotência das operações remotas.
- Access Token e assinatura secreta pertencem ao workspace, são informados em `/app/gateways` e ficam criptografados com AES-256-GCM. Nunca os devolva ao navegador, registre em logs ou adicione ao repositório.
- `CREDENTIALS_ENCRYPTION_KEY` deve ser uma chave base64 de 32 bytes; `API_PUBLIC_URL` deve apontar para a API pública HTTPS com o prefixo `/v1` em homologação e produção.
- O webhook público é individual por credencial, valida `x-signature`, `x-request-id` e `data.id`, deduplica por evento e consulta a order diretamente no Mercado Pago antes de aplicar uma transição financeira.
- O provider `MOCK` continua disponível somente quando o workspace não possui gateway ativo. Confirmação simulada é proibida para pagamentos do Mercado Pago.
- Não marque a Sprint 4 como concluída antes de aplicar/verificar a migration, aprovar os E2E e homologar criação, pagamento e confirmação por webhook com credenciais de teste.

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
- O adapter do Mercado Pago está implementado, mas nenhuma credencial real está conectada e nenhuma transação financeira real foi processada.
- Em 24/08/2026, `pnpm format:check` e `pnpm check` passaram, com 23 testes unitários e 7 builds. `pnpm test:e2e` e `prisma migrate status` ficaram bloqueados porque Docker Desktop, PostgreSQL `:55432` e Redis `:56379` não iniciaram; o Prisma retornou `P1001`/`ECONNREFUSED`.
- O social preview oficial atual é `apps/web/public/og-checkoutv3.png`.
- A Sprint 2 aceita PNG, JPEG ou WebP de até 1 MB como data URL persistida; migre os blobs para storage S3 compatível antes de produção.
