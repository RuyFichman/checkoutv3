# Sprint 3 — Checkout e ciclo do pedido

## Objetivo

Transformar o checkout público da Sprint 2 em um fluxo transacional completo com identificação, resumo, pedido, PIX simulado e eventos append-only, mantendo os valores em centavos e o isolamento por workspace.

## Status

Concluída em 22/08/2026.

## Checklist

- [x] Contratos Zod compartilhados para sessão, identificação, quantidade e comprovante.
- [x] Snapshot de preço, quantidade, subtotal e total na sessão de checkout.
- [x] Criação idempotente por produto e identificador do visitante.
- [x] Etapas públicas de identificação, resumo, pagamento e sucesso.
- [x] Máquina de estados progressiva para sessão, pedido e pagamento.
- [x] Geração de PIX simulado inequivocamente sem valor financeiro.
- [x] Cópia do código PIX e registro idempotente do evento.
- [x] Expiração preguiçosa da sessão, do pedido e do pagamento.
- [x] Upload de comprovante PNG, JPEG, WebP ou PDF de até 2 MB.
- [x] Confirmação explícita do gateway simulado e transição atômica para pago.
- [x] Eventos de acesso, identificação, entrega, pagamento, PIX, comprovante, confirmação e expiração.
- [x] Lista mínima e tenant-safe de pedidos no painel.
- [x] Migration `20260822113000_sprint_3_checkout` aplicada localmente.
- [x] Testes unitários dos contratos, totais e transições.
- [x] E2E do caminho completo com isolamento entre workspaces.
- [x] `pnpm format:check`, `pnpm check` e suíte E2E completa aprovados.

## Fluxos disponíveis

- `/c/:workspaceSlug/:productSlug`: cria ou recupera a sessão do visitante e percorre identificação, resumo, PIX e sucesso.
- `/app/pedidos`: exibe a lista mínima dos pedidos reais do workspace autenticado.
- `POST /v1/public/checkout/:workspaceSlug/:productSlug/sessions`: cria a sessão e registra o acesso.
- `GET /v1/public/checkout-sessions/:sessionId`: consulta o estado e aplica expiração quando necessário.
- `PATCH /v1/public/checkout-sessions/:sessionId/identification`: salva nome, e-mail e CPF quando exigido pelo tema.
- `PATCH /v1/public/checkout-sessions/:sessionId/summary`: confirma quantidade, entrega digital e totais.
- `POST /v1/public/checkout-sessions/:sessionId/pix`: cria pedido, pagamento e código PIX simulados.
- `POST /v1/public/checkout-sessions/:sessionId/pix/copied`: registra a cópia do código uma única vez.
- `POST /v1/public/checkout-sessions/:sessionId/receipt`: anexa o comprovante ao pagamento simulado.
- `POST /v1/public/checkout-sessions/:sessionId/mock-confirmation`: representa a confirmação do gateway simulado.
- `GET /v1/orders`: lista até 100 pedidos recentes, sempre no tenant derivado da sessão autenticada.

## Estados e transições

- Sessão: `OPEN → IDENTIFIED → PAYMENT_PENDING → PAID`.
- Pedido: nasce em `PIX_CREATED` e segue para `PAID` ou `EXPIRED`.
- Pagamento simulado: nasce em `PENDING` e segue para `PAID` ou `EXPIRED`.
- Sessões abertas ou pendentes podem expirar; estados pagos e expirados são terminais nesta sprint.
- Operações repetidas de criação de sessão, geração de PIX, cópia e confirmação preservam um único ciclo consistente.

## Decisões de segurança e fase

- O workspace nunca é aceito do corpo enviado pelo comprador; ele é resolvido pelo produto público ativo.
- O preço unitário é congelado na criação da sessão, e todos os totais são inteiros em centavos.
- A confirmação pública existe somente para o provider `MOCK` e a interface informa que nenhum dinheiro será processado.
- O identificador do visitante serve apenas para idempotência do checkout público e não substitui a sessão autenticada do vendedor.
- Códigos PIX completos e documentos pessoais não são gravados em logs ou eventos.
- Comprovantes ficam como data URL no PostgreSQL apenas nesta fase local, limitados a 2 MB. Antes da produção, devem migrar para storage S3 compatível, com acesso privado e URL temporária.
- A expiração é aplicada ao consultar ou alterar a sessão. Processamento periódico pelo worker pode ser adicionado quando houver gateway real, sem mudar a máquina de estados.

## Limite de escopo

- Não há gateway real, webhook financeiro, reconciliação ou entrega de e-mail; esse é o escopo da Sprint 4.
- A página de pedidos não possui filtros, detalhe, timeline, visualização de comprovante ou exportação; esses recursos permanecem na Sprint 5.

## Critérios de aceite

- Um visitante anônimo percorre identificação, resumo e pagamento sem sessão de vendedor.
- Quantidade habilitada altera subtotal e total sem usar ponto flutuante.
- O PIX simulado pode ser copiado, expira e aceita comprovante dentro dos formatos permitidos.
- A confirmação simulada atualiza sessão, pedido e pagamento na mesma transação e registra o evento de pagamento.
- O vendedor vê o pedido no próprio painel, e outro workspace recebe uma lista vazia.
- A suíte do caminho crítico cobre tema, produto, publicação, checkout, comprovante, pagamento e pedido.

## Próximo passo

A Sprint 4 substituirá a confirmação simulada pelo primeiro adapter PIX real, com cofre de credenciais, webhook assinado, idempotência, replay e reconciliação.
