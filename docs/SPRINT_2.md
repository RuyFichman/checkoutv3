# Sprint 2 — Temas e catálogo de produtos

## Objetivo

Permitir que um vendedor crie a identidade do checkout, cadastre um produto digital e publique uma URL pública fiel à configuração, preservando o isolamento multi-tenant estabelecido na Sprint 1.

## Checklist

- [x] Contratos Zod completos para produto, tema, mídia e checkout público.
- [x] Ciclo `DRAFT`, `ACTIVE` e `ARCHIVED` com datas de publicação e arquivamento.
- [x] CRUD de produtos digitais com slug único por workspace.
- [x] Assistente em três etapas para identidade, oferta/entrega e publicação.
- [x] Salvamento de rascunho, edição, publicação, restauração e exclusão segura.
- [x] CRUD de temas com layout clássico.
- [x] Cores principal, secundária, botão, fundo e texto.
- [x] Logo, banner e imagem de produto em PNG, JPEG ou WebP de até 1 MB.
- [x] Timer configurável, gradiente, selo de segurança e CPF opcional.
- [x] Preview responsivo em desktop e mobile.
- [x] Primeiro checkout público em `/c/:workspaceSlug/:productSlug`.
- [x] Metadados específicos por produto sem reutilizar imagem social genérica.
- [x] Auditoria de criação, edição, publicação, arquivamento e exclusão.
- [x] Migration `20260822084528_sprint_2_catalog` aplicada localmente.
- [x] E2E de criação de tema, produto, publicação, checkout anônimo e isolamento.

## Fluxos disponíveis

- `/app/temas`: lista temas e abre o editor visual com preview ao vivo.
- `/app/produtos`: lista e filtra produtos, abre o assistente e controla o ciclo de publicação.
- `/c/:workspaceSlug/:productSlug`: renderiza o checkout público de um produto ativo.
- `GET/POST /v1/themes` e `GET/PATCH/DELETE /v1/themes/:id`.
- `GET/POST /v1/products`, `GET/PATCH/DELETE /v1/products/:id` e ações de publicação/arquivo/restauração.
- `GET /v1/public/checkout/:workspaceSlug/:productSlug` sem autenticação.

## Regras de negócio

- O slug é normalizado para minúsculas e precisa ser único somente dentro do workspace.
- O produto pode permanecer sem tema enquanto for rascunho.
- Publicação exige preço positivo e tema pertencente ao workspace autenticado.
- Produtos ativos não podem ser excluídos; devem ser arquivados.
- Produtos com sessões ou pedidos preservam o histórico e não podem ser apagados.
- Temas vinculados a produtos ativos não podem ser excluídos.
- A consulta pública retorna somente produtos `ACTIVE` e nunca depende de um tenant informado pelo navegador autenticado.

## Mídia nesta fase

Para manter o ambiente local reproduzível enquanto o provedor de storage está em aberto, imagens são validadas no cliente e na API e persistidas como data URL, limitadas a 1 MB e aos formatos PNG, JPEG e WebP. Antes da produção, os bytes devem migrar para storage compatível com S3; o banco deverá guardar apenas metadados e URLs.

## Critérios de aceite

- Um vendedor cria um tema e observa cores e seções no preview responsivo.
- Um produto é salvo como rascunho e pode ser editado antes da publicação.
- A publicação gera uma URL pública baseada no workspace e no slug do produto.
- Um visitante sem sessão abre o checkout e vê produto, preço, identidade e campos configurados.
- Outro workspace recebe listas vazias e não consegue consultar ou alterar o catálogo do primeiro.
- Produtos arquivados deixam de responder pela URL pública.
- `pnpm check`, `pnpm format:check`, `pnpm test:e2e` e `prisma migrate status` terminam sem erros.

## Próximo passo

A Sprint 3 transformará a página pública em um fluxo transacional: identificação, sessão de checkout, cálculo de quantidade, pedido, PIX simulado, expiração e eventos do funil.
