# Memória do projeto — CheckoutV3

Última atualização: 24/08/2026, após implementar a base do Mercado Pago para a Sprint 4.

## Produto

O CheckoutV3 é uma plataforma multi-tenant própria de checkout e orquestração de pagamentos. O vendedor conecta suas próprias credenciais de gateway, publica produtos e acompanha pedidos e conversão. A referência EzFy serve apenas para mapear fluxos de negócio; marca, identidade, textos e ativos do CheckoutV3 são próprios.

O primeiro marco útil continua sendo: criar conta, configurar tema, cadastrar produto digital, conectar gateway, publicar checkout, gerar/pagar PIX e visualizar pedido e eventos no painel. A Sprint 3 concluiu esse ciclo com provider simulado. A Sprint 4 já possui a base do Mercado Pago implementada, mas depende de infraestrutura local e credenciais de teste para a homologação ponta a ponta.

O CheckoutV3 é exclusivamente PIX. Cartão não pertence ao produto e não deve ser introduzido sem revisão arquitetural e de conformidade explícita.

## Repositório e execução

- Repositório: `https://github.com/RuyFichman/checkoutv3.git`.
- Branch atual: `main`.
- Diretório local: `C:\business\checkoutv3\checkout`.
- Último commit publicado: `4dc6f93` (`feat: concluir sprint 3 checkout e pedidos`).
- O último commit publicado continua sendo a Sprint 3; a implementação atual da Sprint 4 está no worktree e ainda não foi commitada nem enviada.
- Stack aprovada: Next.js 16/React 19 no web, NestJS 11/Fastify 5 na API, PostgreSQL/Prisma 7, Redis/BullMQ e TypeScript estrito em monorepo pnpm/Turborepo.
- Serviços locais: web `:3000`, API `:3333`, PostgreSQL `:55432` e Redis `:56379`.
- Em 24/08/2026, Docker Desktop não concluiu a inicialização. PostgreSQL `:55432` e Redis `:56379` estavam inacessíveis.

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

### Sprint 4 — em andamento, pronta para homologação

- Mercado Pago escolhido como primeiro gateway real; Flevo será avaliada depois e ainda aguarda retorno comercial/técnico.
- Adapter próprio em `packages/gateways` para criar, consultar e cancelar cobranças PIX pela Orders API `/v1/orders`, sem SDK de cartão e sem ponto flutuante para dinheiro.
- `Payment.id` usado como `external_reference` e chave idempotente; retry concorrente reaproveita a mesma cobrança.
- Credenciais por workspace criptografadas com AES-256-GCM e AAD de tenant/provider; Access Token e assinatura secreta nunca retornam ao navegador.
- Painel `/app/gateways` para conectar/rotacionar/desconectar credenciais, copiar URL de webhook, reconciliar pendências e repetir eventos com falha.
- Webhook público por credencial com HMAC, tolerância temporal, deduplicação persistente, consulta da order na origem, replay e auditoria.
- Checkout público exibe QR Code e PIX copia e cola reais, atualiza o status por webhook/polling e bloqueia confirmação simulada quando o provider é Mercado Pago.
- Provider `MOCK` preservado apenas para workspaces sem gateway ativo.
- Migration `20260824120000_sprint_4_mercado_pago` criada, mas ainda não aplicada nem confirmada no banco local.
- Documentação detalhada em `docs/SPRINT_4.md`.

## Rotas disponíveis

### Web

- `/cadastro`, `/entrar`, `/recuperar-senha` e `/redefinir-senha`.
- `/app` para visão geral autenticada.
- `/app/produtos` para catálogo e publicação.
- `/app/temas` para identidade e preview do checkout.
- `/app/pedidos` para pedidos reais do workspace.
- `/app/gateways` para configuração e operação do Mercado Pago.
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

### API adicionada na Sprint 4

- `GET /v1/gateways`.
- `POST /v1/gateways/mercado-pago`.
- `DELETE /v1/gateways/mercado-pago`.
- `POST /v1/gateways/mercado-pago/reconcile`.
- `POST /v1/gateways/webhook-events/:eventId/replay`.
- `POST /v1/webhooks/mercado-pago/:credentialId`, público e protegido por assinatura.

## Decisões duráveis

- A API é a autoridade da sessão autenticada; o cliente recebe apenas cookie `HttpOnly`.
- Tokens de sessão e recuperação são aleatórios e persistidos somente como hash SHA-256.
- Senhas usam `scrypt`, salt único e comparação em tempo constante.
- O tenant é derivado da sessão e aplicado nas consultas do servidor; o navegador nunca fornece um `workspaceId` confiável.
- PostgreSQL é a fonte de verdade; Redis armazena somente estado reconstruível.
- Dinheiro é inteiro em centavos, e a sessão pública congela os valores usados pelo pedido.
- O monólito modular será mantido até métricas justificarem extração de serviços.
- Nenhum campo, dado, fluxo, SDK ou adapter de cartão pertence à plataforma; o produto é exclusivamente PIX.
- Slugs de produto são únicos dentro do workspace; a URL pública combina os slugs do workspace e do produto.
- A criação da sessão pública tolera chamadas concorrentes e é idempotente pelo par produto/visitante.
- A máquina da sessão progride `OPEN → IDENTIFIED → PAYMENT_PENDING → PAID`; `PAID`, `EXPIRED` e `ABANDONED` são terminais nesta fase.
- Transições de pedido/pagamento e seus eventos relevantes são gravados na mesma transação de banco.
- O provider `MOCK` nunca movimenta dinheiro; o código contém `PIX-SIMULADO` e `SEM-VALOR-FINANCEIRO`.
- O Mercado Pago usa a Orders API atual, com uma transação `pix`/`bank_transfer`; a Payments API legada não faz parte da integração.
- Credenciais de gateway são isoladas por workspace e criptografadas com AES-256-GCM antes da persistência. A chave mestre vem de `CREDENTIALS_ENCRYPTION_KEY` e não do banco.
- Webhooks financeiros somente aplicam estado após validar a assinatura e consultar a order diretamente no gateway. Eventos são deduplicados e auditáveis.
- `REFUNDED` é terminal no modelo atual; notificações antigas não podem promover um pagamento devolvido novamente para `PAID`.
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

## Baseline provisório da Sprint 4

- `pnpm format:check`: aprovado.
- `pnpm check`: aprovado, incluindo lint, tipos, 23 testes unitários e 7 builds.
- Testes novos cobrem conversão exata de centavos, idempotência HTTP, mapeamento de status, assinatura HMAC e cofre criptográfico.
- `pnpm test:e2e`: executado, mas os 3 testes falharam antes do fluxo alterado porque o cadastro recebeu `ECONNREFUSED` do Prisma com PostgreSQL desligado.
- `prisma migrate status`: bloqueado com `P1001` em `localhost:55432`.
- Nenhuma requisição foi feita com credenciais reais ou de teste do Mercado Pago e nenhuma transação financeira foi processada.

## Próximos passos da Sprint 4

1. Iniciar Docker Desktop, PostgreSQL e Redis.
2. Aplicar a migration e confirmar `prisma migrate status`.
3. Reexecutar `pnpm test:e2e`.
4. Definir uma `CREDENTIALS_ENCRYPTION_KEY` base64 de 32 bytes e uma `API_PUBLIC_URL` HTTPS.
5. Conectar credenciais de teste em `/app/gateways` e cadastrar o evento **Order (Mercado Pago)** na URL exibida.
6. Homologar criação, pagamento, webhook, reconciliação, cancelamento e expiração sem duplicidade.
7. Conectar o envio de e-mail pós-pagamento antes de concluir a sprint.

O aceite será: uma cobrança de homologação passa de criação a pagamento aprovado, por webhook verificável, sem ajuste manual e sem duplicar pedido ou evento.

Não antecipar a lista/detalhe avançado de pedidos, filtros, timeline, KPIs, funil ou exportação; esses recursos permanecem na Sprint 5.

## Decisões ainda abertas

- Acesso às credenciais de teste e conclusão da homologação do Mercado Pago.
- Retorno da Flevo sobre API, credenciais, webhook e disponibilidade para checkout próprio.
- Provedor de e-mail e storage para produção.
- Percentual e forma de cobrança da plataforma.
- Escopo inicial apenas digital ou antecipação de produtos físicos.
