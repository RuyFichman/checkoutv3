# Memória do projeto — CheckoutV3

Última atualização: 22/08/2026, após o commit e o push da Sprint 3.

## Produto

O CheckoutV3 é uma plataforma multi-tenant própria de checkout e orquestração de pagamentos. O vendedor conecta suas próprias credenciais de gateway, publica produtos e acompanha pedidos e conversão. A referência EzFy serve apenas para mapear fluxos de negócio; marca, identidade, textos e ativos do CheckoutV3 são próprios.

O primeiro marco útil continua sendo: criar conta, configurar tema, cadastrar produto digital, conectar gateway, publicar checkout, gerar/pagar PIX e visualizar pedido e eventos no painel. A Sprint 3 concluiu esse ciclo com provider simulado; a Sprint 4 trocará a confirmação manual pelo primeiro gateway real.

## Repositório e execução

- Repositório: `https://github.com/RuyFichman/checkoutv3.git`.
- Branch atual: `main`.
- Diretório local: `C:\business\checkoutv3\checkout`.
- Último commit publicado: `4dc6f93` (`feat: concluir sprint 3 checkout e pedidos`).
- `main` e `origin/main` estavam sincronizadas e o worktree estava limpo após o push.
- Stack aprovada: Next.js 16/React 19 no web, NestJS 11/Fastify 5 na API, PostgreSQL/Prisma 7, Redis/BullMQ e TypeScript estrito em monorepo pnpm/Turborepo.
- Serviços locais: web `:3000`, API `:3333`, PostgreSQL `:55432` e Redis `:56379`.
- Docker Desktop, PostgreSQL e Redis foram iniciados durante a validação final da Sprint 3.

## Estado das sprints

### Sprint 0 — concluída

- Fundação do monorepo, contratos, banco, worker, design tokens, CI, healthchecks e testes.
- Migration inicial criada e aplicada.

### Sprint 1 — concluída e enviada

- Cadastro transacional, autenticação, recuperação de senha e sessão segura.
- Perfil, workspace, papéis, auditoria, dashboard isolado por tenant e BFF allowlisted.
- Migration `20260822072605_sprint_1_identity` aplicada.
- Commit `cd73777` enviado para `origin/main`.

### Sprint 2 — concluída e enviada

- CRUD de temas e produtos digitais, com rascunho, publicação, arquivamento, restauração e exclusão protegida.
- Assistente de produto em três etapas, mídia local, editor visual e previews desktop/mobile.
- Checkout público em `/c/[workspaceSlug]/[productSlug]`, somente para produtos ativos e com metadados próprios.
- Migration `20260822084528_sprint_2_catalog` aplicada.
- Implementação publicada em `origin/main` no commit `9cca9e5` (`feat: deliver sprint 2 catalog and public checkout`).

### Sprint 3 — concluída e enviada

- Checkout público completo em quatro estados visuais: identificação, resumo, pagamento e sucesso.
- Sessão idempotente por produto/visitante, com snapshot do preço unitário, quantidade, subtotal, total e moeda.
- Máquina progressiva de estados para sessão, pedido e pagamento, com expiração preguiçosa.
- Pedido e pagamento `MOCK`, código PIX inequivocamente simulado, cópia do código e confirmação manual de aprovação.
- Upload de comprovante PNG, JPEG, WebP ou PDF de até 2 MB.
- Eventos append-only para acesso, identificação, entrega, início do pagamento, PIX criado/copiado, comprovante, confirmação e expiração.
- Lista mínima de pedidos em `/app/pedidos`, sempre isolada pelo workspace derivado da sessão autenticada.
- BFF ampliado somente com os prefixos públicos de checkout e a rota autenticada de pedidos.
- Migration `20260822113000_sprint_3_checkout` aplicada; o banco possui quatro migrations e está atualizado.
- Implementação publicada em `origin/main` no commit `4dc6f93` (`feat: concluir sprint 3 checkout e pedidos`).

## Rotas disponíveis

### Web

- `/cadastro`, `/entrar`, `/recuperar-senha` e `/redefinir-senha`.
- `/app` para visão geral autenticada.
- `/app/produtos` para catálogo e publicação.
- `/app/temas` para identidade e preview do checkout.
- `/app/pedidos` para pedidos reais do workspace.
- `/app/configuracoes` para perfil, workspace e auditoria.
- `/app/[section]` para as cascas protegidas dos módulos futuros.
- `/c/[workspaceSlug]/[productSlug]` para o checkout público transacional.
- `/api/backend/[...path]` como BFF restrito.
- `/api/health` no web e `/v1/health` na API.

### API da Sprint 3

- `POST /v1/public/checkout/:workspaceSlug/:productSlug/sessions`.
- `GET /v1/public/checkout-sessions/:sessionId`.
- `PATCH /v1/public/checkout-sessions/:sessionId/identification`.
- `PATCH /v1/public/checkout-sessions/:sessionId/summary`.
- `POST /v1/public/checkout-sessions/:sessionId/pix`.
- `POST /v1/public/checkout-sessions/:sessionId/pix/copied`.
- `POST /v1/public/checkout-sessions/:sessionId/receipt`.
- `POST /v1/public/checkout-sessions/:sessionId/mock-confirmation`.
- `GET /v1/orders` autenticado e tenant-safe.

## Decisões duráveis

- A API é a autoridade da sessão autenticada; o cliente recebe apenas cookie `HttpOnly`.
- Tokens de sessão e recuperação são aleatórios e persistidos somente como hash SHA-256.
- Senhas usam `scrypt`, salt único e comparação em tempo constante.
- O tenant é derivado da sessão e aplicado nas consultas do servidor; o navegador nunca fornece um `workspaceId` confiável.
- PostgreSQL é a fonte de verdade; Redis armazena somente estado reconstruível.
- Dinheiro é inteiro em centavos, e a sessão pública congela os valores usados pelo pedido.
- O monólito modular será mantido até métricas justificarem extração de serviços.
- Nenhum dado completo de cartão será capturado pela plataforma.
- Slugs de produto são únicos dentro do workspace; a URL pública combina os slugs do workspace e do produto.
- A criação da sessão pública tolera chamadas concorrentes e é idempotente pelo par produto/visitante.
- A máquina da sessão progride `OPEN → IDENTIFIED → PAYMENT_PENDING → PAID`; `PAID`, `EXPIRED` e `ABANDONED` são terminais nesta fase.
- Transições de pedido/pagamento e seus eventos relevantes são gravados na mesma transação de banco.
- O provider `MOCK` nunca movimenta dinheiro; o código contém `PIX-SIMULADO` e `SEM-VALOR-FINANCEIRO`.
- A expiração da Sprint 3 é aplicada ao ler ou alterar a sessão. Processamento periódico pode entrar com o gateway real sem mudar a máquina de estados.
- Logo, banner e imagem de produto usam data URL de PNG, JPEG ou WebP de até 1 MB na fase local.
- Comprovantes usam data URL de PNG, JPEG, WebP ou PDF de até 2 MB na fase local.
- Antes da produção, mídias e comprovantes devem migrar para storage privado S3-compatible, mantendo no banco apenas metadados e URLs temporárias/assinadas.

## Baseline de qualidade da Sprint 3

- `pnpm format:check`: aprovado.
- `pnpm check`: aprovado, incluindo lint, tipos, 18 testes unitários e 7 builds.
- `pnpm test:e2e`: 3 testes aprovados no Chromium.
- O E2E crítico percorre tema, produto, publicação, identificação, resumo, PIX, cópia, comprovante, confirmação, pedido pago e isolamento entre workspaces.
- `prisma migrate status`: 4 migrations aplicadas; banco atualizado.
- Build do Next confirma `/c/[workspaceSlug]/[productSlug]` e `/app/[section]` como rotas dinâmicas.

## Próxima sprint

Sprint 4 — primeiro gateway real:

1. Confirmar o gateway escolhido e obter acesso ao ambiente de homologação.
2. Implementar o adapter padronizado e o cofre criptografado de credenciais.
3. Criar, consultar, cancelar e expirar cobranças PIX reais de homologação.
4. Receber webhook assinado com idempotência, replay seguro e reconciliação.
5. Substituir a confirmação `MOCK` no fluxo normal e manter o simulador apenas para testes.
6. Adicionar redirecionamento e e-mail pós-pagamento.

O aceite será: uma cobrança de homologação passa de criação a pagamento aprovado, por webhook verificável, sem ajuste manual e sem duplicar pedido ou evento.

Não antecipar a lista/detalhe avançado de pedidos, filtros, timeline, KPIs, funil ou exportação; esses recursos permanecem na Sprint 5.

## Decisões ainda abertas

- Gateway real que será integrado primeiro e acesso ao sandbox/homologação.
- Provedor de e-mail e storage para produção.
- Percentual e forma de cobrança da plataforma.
- Escopo inicial apenas digital ou antecipação de produtos físicos.
