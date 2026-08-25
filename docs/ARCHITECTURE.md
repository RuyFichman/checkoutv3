# Arquitetura

## Contexto

O CheckoutV3 será uma camada de checkout e orquestração. O dinheiro é processado pelos gateways conectados pelo vendedor; a plataforma controla a experiência, os pedidos, a telemetria e a seleção do adaptador.

## Decisão: produto exclusivamente PIX

O CheckoutV3 aceita e orquestra exclusivamente pagamentos via PIX. Cartões ficam fora do escopo do produto: não serão criados campos de captura, contratos, modelos persistentes, SDKs, scripts, iframes, endpoints ou adapters para dados ou pagamentos com cartão. O provider `MOCK` simula somente uma cobrança PIX e não representa um método de pagamento adicional.

Essa restrição também se aplica à cobrança da própria plataforma. Nenhum fluxo do CheckoutV3 deve armazenar, processar ou transmitir PAN, código de segurança, data de validade ou outros dados de cartão. Abstrações genéricas para cartão não devem ser antecipadas nos contratos compartilhados nem na interface `GatewayAdapter`.

Como consequência, o produto não presume enquadramento em SAQ A ou SAQ D apenas por operar pagamentos: o escopo PCI DSS deve ser determinado a partir do fluxo efetivamente implantado e validado com a entidade responsável pela conformidade antes de qualquer declaração pública. Uma futura inclusão de cartões exigirá uma nova decisão arquitetural, análise formal de escopo PCI, revisão do modelo de ameaças e aprovação explícita antes de qualquer implementação.

Ser PIX-only não reduz os demais controles. Continuam obrigatórios o cumprimento da LGPD, o isolamento por workspace, a minimização e retenção adequada de dados pessoais, a criptografia das credenciais dos PSPs, a idempotência das operações financeiras, a validação e o replay seguro de webhooks, a reconciliação e a trilha de auditoria.

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

Todo PSP/gateway PIX implementa `GatewayAdapter`. A interface padroniza:

- criação de cobrança PIX;
- consulta de cobrança;
- cancelamento/expiração;
- validação e interpretação de webhook.

Regras de idempotência, persistência e transição de pedido ficam no domínio, não dentro do adapter.

O primeiro adapter real é o Mercado Pago pela Orders API do Checkout Transparente. O CheckoutV3 envia somente uma transação `pix` do tipo `bank_transfer`; a API Payments legada e quaisquer recursos de cartão permanecem fora do produto. O identificador local do pagamento é usado como referência externa e chave de idempotência, e valores em centavos são convertidos para strings decimais sem cálculo em ponto flutuante.

Cada credencial pertence a um workspace e é cifrada com AES-256-GCM, usando `workspaceId` e provider como contexto autenticado. A chave mestra fica exclusivamente no ambiente. A URL de webhook contém o identificador opaco da credencial para localizar o tenant; o workspace nunca é aceito do payload. Notificações Orders exigem HMAC válido, tolerância temporal, persistência idempotente e consulta posterior da order antes de qualquer transição financeira.

## Segurança

- tenant obtido da sessão autenticada, nunca de um campo confiado do cliente;
- autorização aplicada no serviço e reforçada nas consultas;
- tokens de sessão e de recuperação persistidos somente como hash SHA-256;
- senhas derivadas com `scrypt`, salt único e comparação em tempo constante;
- cookie de sessão `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- redefinição de senha de uso único revoga todas as sessões do usuário;
- segredos criptografados por envelope encryption com chave fora do banco;
- payloads de webhook armazenados com remoção de dados desnecessários;
- logs sem tokens, códigos PIX completos ou documentos pessoais;
- valores em centavos e alterações financeiras dentro de transações de banco.

## Identidade e isolamento multi-tenant

A API é a autoridade da sessão. O painel encaminha apenas o cookie para a API por uma rota BFF restrita e não armazena tokens no navegador. Cada sessão aponta para um workspace ativo; o guard autentica a sessão, carrega a associação e fornece o `workspaceId` confiável para os serviços.

Consultas operacionais são construídas com o escopo do tenant no servidor. Papéis `OWNER`, `ADMIN` e `MEMBER` controlam operações administrativas, e mudanças relevantes produzem registros append-only em `AuditLog`.

## Catálogo e publicação

Produtos começam como `DRAFT`, podem ser editados sem exposição pública e só passam a `ACTIVE` quando possuem preço positivo e um tema do mesmo workspace. O arquivamento remove o checkout da consulta pública sem apagar o histórico; produtos com sessões ou pedidos não podem ser excluídos.

Temas armazenam identidade visual e um objeto validado de configurações do layout clássico. A URL pública usa `/c/:workspaceSlug/:productSlug`, consulta somente produtos ativos e não aceita `workspaceId` enviado pelo cliente. Slugs são únicos dentro de cada workspace.

Na Sprint 2, imagens de até 1 MB são aceitas como data URLs validadas para manter o fluxo local reproduzível enquanto o provedor de storage permanece em aberto. Antes de produção, esses blobs deverão migrar para storage compatível com S3, mantendo no PostgreSQL apenas metadados e URLs.

## Checkout e ciclo transacional

A abertura do checkout cria uma `CheckoutSession` idempotente por produto e identificador do visitante. A sessão congela preço unitário, moeda, quantidade, subtotal e total; alterações posteriores no catálogo não modificam um pedido em andamento.

O fluxo progride de `OPEN` para `IDENTIFIED`, `PAYMENT_PENDING` e `PAID`. Pedidos e pagamentos são criados junto ao PIX simulado, e cada transição relevante grava um `CheckoutEvent` na mesma transação de banco. A expiração é aplicada de forma preguiçosa em leituras e comandos públicos, levando sessão, pedido e pagamento pendentes a `EXPIRED` sem alterar estados terminais.

O provider `MOCK` produz um código deliberadamente não pagável e expõe uma confirmação explícita somente para workspaces sem gateway ativo. Quando o Mercado Pago está conectado, a cobrança real usa a Orders API, a confirmação simulada é rejeitada e o status é atualizado por webhook assinado ou reconciliação autenticada.

Comprovantes aceitam PNG, JPEG, WebP ou PDF de até 2 MB e ficam temporariamente como data URL para manter o desenvolvimento local reproduzível. Antes da produção, devem migrar para storage privado compatível com S3; a visualização autenticada por URL temporária permanece para a Sprint 5.

## Evolução

Serviços só serão extraídos quando métricas demonstrarem necessidade. Os candidatos naturais são ingestão de eventos, entrega de webhooks, processamento de mídia e adapters de gateways com alto volume.
