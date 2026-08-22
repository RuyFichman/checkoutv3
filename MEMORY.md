# Memória do projeto — CheckoutV3

Última atualização: 22/08/2026, após o commit e o push da Sprint 2.

## Produto

O CheckoutV3 será uma plataforma multi-tenant de checkout e orquestração de pagamentos. O vendedor conecta suas próprias credenciais de gateway, publica produtos e acompanha pedidos e conversão. A referência EzFy serve apenas para mapear fluxos de negócio; a marca, a identidade e os ativos do CheckoutV3 são próprios.

O primeiro marco útil continua sendo: criar conta, configurar tema, cadastrar produto digital, conectar gateway, publicar checkout, gerar/pagar PIX e visualizar pedido e eventos no painel.

## Repositório e execução

- Repositório: `https://github.com/RuyFichman/checkoutv3.git`.
- Branch atual: `main`.
- Diretório local: `C:\business\checkoutv3\checkout`.
- Stack aprovada: Next.js/React no web, NestJS/Fastify na API, PostgreSQL/Prisma, Redis/BullMQ e TypeScript em monorepo pnpm/Turborepo.
- A infraestrutura local usa PostgreSQL na porta `55432` e Redis na `56379`.

## Estado das sprints

### Sprint 0 — concluída

- Fundação do monorepo, contratos, banco, worker, design tokens, CI, healthchecks e testes.
- Migration inicial criada e aplicada.

### Sprint 1 — concluída e enviada

- Cadastro transacional, autenticação, recuperação de senha e sessão segura.
- Perfil, workspace, papéis, auditoria, dashboard isolado por tenant e BFF allowlisted.
- Migration `20260822072605_sprint_1_identity` aplicada.
- Commit `cd73777` enviado para `origin/main`.

### Sprint 2 — concluída

- CRUD completo de temas e produtos digitais, com rascunho, publicação, arquivamento, restauração e exclusão protegida.
- Assistente de produto em três etapas, upload local de imagem e preview do checkout.
- Editor visual de tema com logo, banner, cores, textos, timer, CPF e selo de segurança; previews desktop e mobile.
- Checkout público em `/c/[workspaceSlug]/[productSlug]`, disponível somente para produtos ativos e com metadados próprios.
- API pública e autenticada com escopo de workspace derivado exclusivamente da sessão.
- Migration `20260822084528_sprint_2_catalog` aplicada; o banco possui três migrations e está atualizado.
- Auditoria cobre criação, edição, publicação, arquivamento e exclusão do catálogo.
- A implementação integral da Sprint 2 foi publicada em `origin/main` no commit `9cca9e5` (`feat: deliver sprint 2 catalog and public checkout`).

## Rotas disponíveis

- `/cadastro`, `/entrar`, `/recuperar-senha` e `/redefinir-senha`.
- `/app` para visão geral autenticada.
- `/app/produtos` para catálogo e publicação.
- `/app/temas` para identidade e preview do checkout.
- `/app/configuracoes` para perfil, workspace e auditoria.
- `/app/[section]` para as cascas protegidas dos módulos futuros.
- `/c/[workspaceSlug]/[productSlug]` para o checkout público.
- `/api/backend/[...path]` como BFF restrito.
- `/api/health` no web e `/v1/health` na API.

## Decisões duráveis

- A API é a autoridade da sessão; o cliente recebe apenas cookie `HttpOnly`.
- Tokens de sessão e recuperação são aleatórios e persistidos somente como hash SHA-256.
- Senhas usam `scrypt`, salt único e comparação em tempo constante.
- O tenant é derivado da sessão e aplicado nas consultas do servidor.
- PostgreSQL é a fonte de verdade; Redis armazena somente estado reconstruível.
- Dinheiro é inteiro em centavos.
- O monólito modular será mantido até métricas justificarem extração de serviços.
- Nenhum dado sensível de cartão será capturado pela plataforma.
- Slugs de produto são únicos dentro do workspace; a URL pública combina os slugs do workspace e do produto.
- Na Sprint 2, logo, banner e imagem usam data URL de PNG, JPEG ou WebP com arquivo de até 1 MB. Antes da produção, migrar a mídia para storage S3-compatible com URL assinada.

## Baseline de qualidade da Sprint 2

- `pnpm format:check`: aprovado.
- `pnpm check`: aprovado, incluindo lint, tipos, 13 testes unitários e 7 builds.
- `pnpm test:e2e`: 3 testes aprovados — isolamento/navegação, recuperação de senha e criação/publicação/checkout público isolado.
- `prisma migrate status`: 3 migrations aplicadas; banco atualizado.
- Build do Next confirma a rota pública dinâmica.

## Próxima sprint

Sprint 3 — checkout transacional e PIX:

1. Contrato de gateway e primeiro adaptador de pagamento.
2. Configuração segura das credenciais do vendedor.
3. Criação idempotente de sessão de checkout e pedido.
4. Geração de PIX, QR Code, expiração e consulta de status.
5. Webhook assinado, processamento assíncrono e atualização do pedido.
6. Estados reais de sucesso, expiração e falha no checkout público.

O aceite será: um comprador inicia um checkout publicado, gera um PIX em sandbox, o webhook confirma o pagamento uma única vez e o vendedor visualiza o pedido pago.

## Decisões ainda abertas

- Gateway real que será integrado primeiro e acesso ao sandbox.
- Provedor de e-mail e storage para produção.
- Percentual e forma de cobrança da plataforma.
- Escopo inicial apenas digital ou antecipação de produtos físicos.
