# Memória do projeto — CheckoutV3

Última atualização: 22/08/2026, após a conclusão técnica da Sprint 1.

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

### Sprint 1 — implementada e validada localmente

- Cadastro transacional cria usuário, workspace, associação `OWNER`, sessão e auditoria.
- Login, logout, sessão persistida e recuperação/redefinição de senha estão funcionais.
- Perfil do vendedor e workspace podem ser atualizados; mudanças administrativas respeitam papéis.
- Dashboard autenticado possui métricas isoladas por tenant e modo demonstração.
- Sidebar responsiva contém as rotas dos módulos previstos; módulos futuros exibem placeholders protegidos.
- Estados de loading, vazio, erro e feedback foram implementados.
- O BFF web encaminha somente rotas allowlisted para a API.
- Migration `20260822072605_sprint_1_identity` aplicada; o banco possui duas migrations e está atualizado.
- Social preview próprio salvo em `apps/web/public/og-checkoutv3.png` e conectado aos metadados.

As mudanças da Sprint 1 estão no working tree e ainda não foram commitadas ou enviadas após essa entrega.

## Rotas disponíveis

- `/cadastro`, `/entrar`, `/recuperar-senha` e `/redefinir-senha`.
- `/app` para visão geral autenticada.
- `/app/configuracoes` para perfil, workspace e auditoria.
- `/app/[section]` para as cascas protegidas dos módulos futuros.
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

## Baseline de qualidade da Sprint 1

- `pnpm format:check`: aprovado.
- `pnpm check`: aprovado, incluindo lint, tipos, 11 testes unitários e 7 builds.
- `pnpm test:e2e`: 2 testes aprovados — isolamento/navegação e recuperação de senha.
- `prisma migrate status`: banco atualizado.
- `git diff --check`: aprovado.

## Próxima sprint

Sprint 2 — temas e catálogo de produtos:

1. CRUD e arquivamento de produtos digitais.
2. Assistente de criação com validação e rascunho.
3. CRUD de temas e upload de logo/banner.
4. Preview responsivo e primeiro checkout público configurável.
5. Slug público e vínculo do tema ao produto.

O aceite será: o vendedor cria um tema e um produto e abre uma URL pública de checkout fiel à configuração.

## Decisões ainda abertas

- Gateway real que será integrado primeiro e acesso ao sandbox.
- Provedor de e-mail e storage para produção.
- Percentual e forma de cobrança da plataforma.
- Escopo inicial apenas digital ou antecipação de produtos físicos.
