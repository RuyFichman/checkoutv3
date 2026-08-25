# Sprint 4 — Primeiro gateway real

## Objetivo

Conectar o primeiro PSP PIX real sem romper o isolamento multi-tenant, substituir a confirmação simulada quando houver credencial ativa e tornar cada transição financeira verificável, idempotente e auditável.

## Status

Em andamento desde 24/08/2026. O Mercado Pago foi escolhido como primeiro gateway. A implementação está pronta para configuração e homologação, mas a sprint não está concluída enquanto uma cobrança de teste não percorrer criação, pagamento e confirmação por webhook e o envio de e-mail pós-pagamento não for conectado.

## Decisão de integração

- Usar a Orders API atual do Checkout Transparente em `POST /v1/orders`, não a API Payments legada.
- Enviar exclusivamente `payment_method.id=pix` e `payment_method.type=bank_transfer`.
- Manter valores no domínio em centavos e convertê-los para strings decimais somente na borda do adapter.
- Usar o ID local de `Payment` como `external_reference` e `X-Idempotency-Key` da criação.
- Manter o provider `MOCK` somente em workspaces sem credencial real ativa, preservando desenvolvimento local e E2E.

## Entregue no código

- [x] Adapter Mercado Pago para criar, consultar e cancelar orders PIX.
- [x] Mapeamento explícito de status da Orders API para os estados internos.
- [x] QR Code em base64, PIX copia e cola e URL de pagamento no checkout público.
- [x] Cofre AES-256-GCM com contexto autenticado por workspace e provider.
- [x] Tela `/app/gateways` com conexão, rotação, desativação e estados de permissão.
- [x] Credenciais nunca retornam pela API nem são persistidas em texto puro.
- [x] Webhook Orders com validação HMAC, tolerância temporal e consulta da order na origem.
- [x] Eventos de webhook persistidos com chave única, tentativas, falha e replay autenticado.
- [x] Reconciliação manual de pagamentos pendentes e cancelamento dos já expirados localmente.
- [x] Verificação de credencial, workspace, referência, moeda e valor antes de marcar como pago.
- [x] Confirmação simulada bloqueada para pagamentos do Mercado Pago.
- [x] Polling do checkout como apoio de experiência; webhook permanece a confirmação principal.
- [x] Migration `20260824120000_sprint_4_mercado_pago`.
- [x] Testes unitários de adapter, idempotência HTTP, centavos, HMAC, cofre e contratos.

## Pendente para concluir

- [ ] Definir uma `CREDENTIALS_ENCRYPTION_KEY` segura no ambiente de homologação.
- [ ] Publicar a API em uma URL HTTPS e configurar `API_PUBLIC_URL` incluindo o prefixo `/v1`.
- [ ] Criar ou selecionar a aplicação no Mercado Pago e obter Access Token e assinatura secreta.
- [ ] Configurar o evento **Order (Mercado Pago)** com a URL exibida em `/app/gateways`.
- [ ] Executar uma cobrança PIX de homologação até `processed/accredited` e conferir pedido, pagamento e evento.
- [ ] Conectar o provedor de e-mail e validar a entrega pós-pagamento.
- [ ] Executar `pnpm format:check`, `pnpm check`, `pnpm test:e2e` e confirmar `prisma migrate status`.

## Configuração local e de homologação

Gere uma chave de 32 bytes uma única vez e armazene o resultado como segredo do ambiente:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Variáveis necessárias:

```dotenv
CREDENTIALS_ENCRYPTION_KEY=<base64-de-32-bytes>
API_PUBLIC_URL=https://api.seu-dominio.com/v1
```

Depois, acesse `/app/gateways`, informe o Access Token e a assinatura secreta, copie a URL individual do webhook e selecione o evento **Order (Mercado Pago)** na aplicação do Mercado Pago. Segredos do vendedor são dados de painel e não pertencem ao `.env` compartilhado do projeto.

## Endpoints

- `GET /v1/gateways`: estado seguro da conexão e últimos eventos.
- `POST /v1/gateways/mercado-pago`: conecta ou rotaciona a credencial do workspace.
- `DELETE /v1/gateways/mercado-pago`: desativa novas cobranças sem apagar o histórico.
- `POST /v1/gateways/mercado-pago/reconcile`: consulta pendentes e cancela expirados.
- `POST /v1/gateways/webhook-events/:eventId/replay`: reprocessa um evento validado.
- `POST /v1/webhooks/mercado-pago/:credentialId`: recebe notificações Orders assinadas.

## Segurança e operação

- O tenant de configuração e reconciliação vem da sessão autenticada.
- O tenant do webhook vem da credencial localizada pelo path e nunca do corpo da notificação.
- A assinatura usa `data.id`, `x-request-id` e `ts` conforme o manifesto do Mercado Pago.
- Payload persistido é reduzido a identificadores e ação; documentos, tokens e códigos PIX completos não entram no log de webhook.
- Webhooks duplicados reutilizam o mesmo evento e não repetem a transição financeira.
- Uma notificação válida só produz efeito após consultar a order diretamente no Mercado Pago.
