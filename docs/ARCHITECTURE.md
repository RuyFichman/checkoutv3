# Arquitetura

## Contexto

O CheckoutV3 será uma camada de checkout e orquestração. O dinheiro é processado pelos gateways conectados pelo vendedor; a plataforma controla a experiência, os pedidos, a telemetria e a seleção do adaptador.

## Decisão: monólito modular

O MVP será um monólito modular TypeScript distribuído em três processos:

- `web`: interface e páginas públicas;
- `api`: regras transacionais e integrações síncronas;
- `worker`: tarefas assíncronas e retentativas.

Eles compartilham contratos e banco, mas têm ciclos de execução independentes. Essa divisão preserva velocidade de desenvolvimento e permite escalar checkout, API e filas separadamente.

## Fronteiras iniciais

- **Identity:** usuários, sessões, workspaces e permissões.
- **Catalog:** produtos, temas, fretes e order bumps.
- **Checkout:** sessões, etapas, totais e experiência pública.
- **Orders:** pedidos, pagamentos e timeline.
- **Gateways:** credenciais, adapters, roteamento e webhooks de entrada.
- **Analytics:** eventos, funil e agregações.
- **Delivery:** e-mails, webhooks de saída e notificações.
- **Billing:** comissão da plataforma, ledger e faturas.

Cada módulo deverá expor operações explícitas. Acesso direto entre tabelas de módulos diferentes será evitado nas regras de negócio.

## Fonte de verdade

PostgreSQL é a fonte de verdade para estado transacional. Redis não armazena dados que não possam ser reconstruídos; será usado para filas, locks curtos, idempotência temporária, rate limit e presença em tempo real.

O funil é derivado de `CheckoutEvent`. Eventos são append-only e recebem o workspace, a sessão, o tipo e o instante da ocorrência.

## Adaptadores de gateway

Todo gateway implementa `GatewayAdapter`. A interface padroniza:

- criação de cobrança PIX;
- consulta de cobrança;
- cancelamento/expiração;
- validação e interpretação de webhook.

Regras de idempotência, persistência e transição de pedido ficam no domínio, não dentro do adapter.

## Segurança

- tenant obtido da sessão autenticada, nunca de um campo confiado do cliente;
- autorização aplicada no serviço e reforçada nas consultas;
- segredos criptografados por envelope encryption com chave fora do banco;
- payloads de webhook armazenados com remoção de dados desnecessários;
- logs sem tokens, códigos PIX completos ou documentos pessoais;
- valores em centavos e alterações financeiras dentro de transações de banco.

## Evolução

Serviços só serão extraídos quando métricas demonstrarem necessidade. Os candidatos naturais são ingestão de eventos, entrega de webhooks, processamento de mídia e adapters de gateways com alto volume.
