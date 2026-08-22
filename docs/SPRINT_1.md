# Sprint 1 — Acesso e casca do painel

## Objetivo

Entregar a primeira experiência autenticada do CheckoutV3, com isolamento real por workspace, navegação responsiva e uma base segura para os módulos de catálogo da Sprint 2.

## Checklist

- [x] Cadastro transacional de usuário, workspace e associação `OWNER`.
- [x] Login e logout com sessão opaca persistida no PostgreSQL.
- [x] Recuperação e redefinição de senha com token de uso único.
- [x] Revogação de todas as sessões após troca de senha.
- [x] Perfil do vendedor e configurações do workspace.
- [x] Papéis `OWNER`, `ADMIN` e `MEMBER` com autorização básica.
- [x] Auditoria de cadastro, acesso, saída e alterações administrativas.
- [x] BFF web restrito para encaminhar sessões sem expor tokens ao cliente.
- [x] Layout responsivo com sidebar desktop e navegação móvel.
- [x] Rotas protegidas para todos os módulos planejados.
- [x] Dashboard com métricas reais isoladas por tenant e modo demonstração.
- [x] Estados de carregamento, vazio, erro e feedback de formulários.
- [x] Migration `20260822072605_sprint_1_identity` aplicada localmente.
- [x] Testes unitários de credenciais, contratos e escopo multi-tenant.
- [x] Testes E2E de cadastro, isolamento entre tenants, navegação, logout e recuperação de senha.
- [x] Social preview próprio integrado aos metadados do app.

## Fluxos disponíveis

- `/cadastro`: cria vendedor, workspace e primeira sessão.
- `/entrar`: autentica e direciona ao workspace ativo.
- `/recuperar-senha`: solicita redefinição sem revelar se o e-mail existe.
- `/redefinir-senha`: consome token válido e encerra sessões anteriores.
- `/app`: mostra a visão geral do workspace autenticado.
- `/app/configuracoes`: edita perfil, workspace e consulta auditoria.
- `/app/:modulo`: apresenta a casca protegida dos módulos das próximas sprints.

## Decisões de segurança

- A senha é derivada com `scrypt`, salt aleatório e comparação em tempo constante.
- O navegador recebe apenas um cookie `HttpOnly`; o banco guarda somente o hash do token de sessão.
- O cookie usa `SameSite=Lax`, expira em 14 dias e recebe `Secure` em produção.
- Tokens de recuperação expiram em 30 minutos, são de uso único e também são persistidos como hash.
- A resposta de recuperação é sempre genérica. O token só aparece na interface em desenvolvimento local.
- O tenant é obtido da sessão no servidor, nunca de um identificador enviado pelo cliente.
- Alterações de workspace exigem `OWNER` ou `ADMIN`.

## Critérios de aceite

- Um usuário novo cria a conta e entra automaticamente no próprio workspace.
- Duas sessões de navegador criam tenants distintos e não observam os dados uma da outra.
- Um visitante anônimo é redirecionado para o login ao acessar `/app`.
- O usuário navega por todas as entradas da sidebar sem perder a proteção da sessão.
- Logout invalida a sessão e impede o retorno ao painel.
- A senha redefinida substitui a anterior e permite um novo login.
- `pnpm check`, `pnpm format:check` e `pnpm test:e2e` terminam sem erros.

## Próximo passo

A Sprint 2 usará essa base para entregar CRUD de temas e produtos digitais, assistentes de criação e o primeiro checkout público configurável.
