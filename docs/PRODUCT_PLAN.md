# Plano do produto — plataforma de checkout e orquestração

## Objetivo

Construir uma plataforma própria inspirada nos fluxos observados nas 52 capturas da EzFy, sem reutilizar marca, logotipo, textos proprietários ou outros ativos da empresa. O produto será uma camada de checkout e orquestração: o vendedor conecta as próprias credenciais de um adquirente/gateway, publica produtos e acompanha todo o funil de conversão.

O primeiro marco útil é o fluxo completo:

1. vendedor cria a conta;
2. configura um tema;
3. cadastra um produto digital;
4. conecta um gateway;
5. publica e compartilha o checkout;
6. comprador gera e paga um PIX;
7. webhook confirma o pagamento;
8. vendedor vê o pedido e os eventos no painel.

## Inventário funcional extraído das capturas

### Aquisição

- Landing page escura com demonstração do painel, benefícios, integrações, depoimentos, FAQ e CTA.
- Cadastro e login.
- Posicionamento comercial sem mensalidade e com comissão sobre venda aprovada.

### Operação do vendedor

- Visão geral com receita, PIX gerados, pedidos aprovados, taxa de aprovação, visitantes ao vivo e funil.
- Catálogo de produtos digitais e físicos, arquivamento e assistente de criação.
- Assistente de produto com tipo, nome/slug, preço, quantidade, imagem, descrição, tema, entrega por e-mail, redirecionamento e rastreamento.
- Order bumps reutilizáveis.
- Fretes para produtos físicos.
- Pixels Meta/TikTok, CAPI e credenciais UTMify.
- Temas de checkout com logo, banner, cinco layouts, cores, gradiente e campos opcionais.
- Gateways com credenciais próprias, rota principal, fallback e testes A/B.
- Pedidos com estados de geração, cópia e confirmação do PIX e comprovante anexado.
- Domínios da plataforma e domínios personalizados.
- Notificações e webhooks de saída.

### Conta e crescimento

- Cobrança da comissão da plataforma, cartão, saldo, cupom e faturas.
- Programa de indicação com comissões e saque via PIX.
- Premiações por volume processado.
- Suporte via WhatsApp/comunidade.

## Arquitetura inicial

Começar como monólito modular em TypeScript, mantendo fronteiras que permitam separar serviços quando o volume justificar:

- painel e páginas públicas em Next.js;
- API transacional em Node.js;
- PostgreSQL como fonte de verdade;
- Redis para cache, idempotência curta, rate limit e filas;
- worker para webhooks, e-mails, notificações e retentativas;
- storage compatível com S3 para logos, produtos e comprovantes;
- adaptadores de gateway atrás de uma interface única;
- eventos imutáveis de checkout/pedido para alimentar o funil;
- monorepo com pacotes compartilhados de UI, banco, contratos e adaptadores.

Princípios obrigatórios: multi-tenant desde o início, valores monetários em centavos, webhooks idempotentes, credenciais criptografadas, trilha de auditoria e nenhuma captura de dados de cartão nos nossos servidores.

## Sprints

Cada sprint termina com demonstração navegável, testes do caminho crítico e estados de loading, vazio e erro.

### Sprint 0 — Fundação do repositório

- Criar monorepo, lint, formatação, testes e variáveis de ambiente.
- Subir PostgreSQL/Redis localmente e criar pipeline de migrations.
- Definir tokens visuais próprios, tema escuro e biblioteca de componentes.
- Criar contratos centrais: usuário, workspace, produto, tema, checkout, pedido, pagamento e evento.
- Preparar CI e documentação de execução.

**Aceite:** projeto inicia com um comando, healthcheck responde e CI valida lint, tipos e testes.

### Sprint 1 — Acesso e casca do painel

- Cadastro, login, recuperação de senha e sessão.
- Workspace/tenant e perfil do vendedor.
- Layout responsivo com sidebar e rotas de todos os módulos.
- Dashboard inicial com dados de demonstração e estados vazios.
- Controle básico de acesso e auditoria.

**Aceite:** usuário novo entra no próprio workspace e navega pelo painel sem acessar dados de outro tenant.

### Sprint 2 — Temas e catálogo de produtos

- CRUD e arquivamento de produtos digitais.
- Assistente de criação com validação e salvamento de rascunho.
- CRUD de temas, upload de logo/banner e pré-visualização responsiva.
- Primeiro layout público, cores, gradiente, timer, selo e CPF opcional.
- Slug público e seleção do tema no produto.

**Aceite:** vendedor cria tema e produto e abre uma URL pública de checkout fiel à configuração.

### Sprint 3 — Checkout e ciclo do pedido

- Etapas de identificação, resumo e pagamento.
- Sessão de checkout, quantidade e cálculo de totais.
- Máquina de estados do pedido e do pagamento.
- Geração simulada de PIX, copiar código, expiração e upload de comprovante.
- Registro de eventos: acesso, dados, entrega, pagamento, PIX gerado, copiado e pago.

**Aceite:** o fluxo público completo funciona com gateway simulado e aparece no painel de pedidos.

### Sprint 4 — Primeiro gateway real

- Interface padronizada de adapters e cofre de credenciais.
- Conectar um gateway escolhido para PIX.
- Criar cobrança, consultar status, cancelar/expirar e receber webhook.
- Assinatura, idempotência, replay seguro e reconciliação.
- Redirecionamento e e-mail pós-pagamento.

**Aceite:** uma cobrança de homologação passa de criação a pagamento aprovado sem ajuste manual.

### Sprint 5 — Pedidos, dashboard e funil

- Lista e detalhe de pedidos com filtros e timeline.
- Visualização segura de comprovante.
- KPIs e funil por período com volume absoluto e percentual.
- Visitantes ao vivo e taxa de conversão.
- Exportação CSV e conciliação básica.

**Aceite:** números do dashboard são derivados dos eventos reais e conferem com os pedidos do período.

### Sprint 6 — Orquestração de gateways

- Múltiplas credenciais e status de saúde.
- Ordem principal e fallback na mesma sessão.
- Política de retentativa sem duplicar cobrança.
- Teste A/B de gateways e apuração automática da conversão.
- Observabilidade e alertas de falha por adaptador.

**Aceite:** falha controlada no gateway principal aciona o fallback e mantém um único pedido consistente.

### Sprint 7 — Conversão e entrega

- Catálogo e vinculação de order bumps.
- Entrega digital por e-mail e histórico de envios.
- Pixels Meta/TikTok, CAPI, UTM e UTMify sem duplicidade.
- Layouts adicionais: minimalista, resumo lateral, físico/EzShop e API PIX.
- Frete e endereço para produtos físicos.

**Aceite:** pedido com bump e/ou frete calcula total corretamente e emite os eventos de conversão uma vez.

### Sprint 8 — Domínios, webhooks e notificações

- Domínios próprios por CNAME, validação e certificado.
- Roteamento por hostname sem perder parâmetros de campanha.
- Webhooks configuráveis, assinatura, logs, retentativa e replay.
- Notificações de venda e falha operacional.

**Aceite:** checkout funciona em domínio customizado e entrega um webhook assinado com replay auditável.

### Sprint 9 — Monetização da plataforma

- Regra configurável de comissão por venda aprovada.
- Ledger imutável de débitos/créditos, saldo e faturas.
- Cupons, créditos e cobrança automática.
- Bloqueio e desbloqueio com regras explícitas.
- Relatórios financeiros e trilha de auditoria.

**Aceite:** toda comissão é reconciliável até o pedido e nenhuma alteração de saldo ocorre sem lançamento no ledger.

### Sprint 10 — Crescimento, marketing e hardening

- Indicação, comissão, saque via PIX e relatórios.
- Marcos de premiação e solicitação de placa.
- Landing page, FAQ e suporte com identidade própria.
- LGPD, termos, retenção/exclusão de dados, backups e recuperação.
- Testes de carga, segurança, acessibilidade, observabilidade e runbooks.

**Aceite:** produto fica pronto para operação assistida, com métricas, alertas, backup testado e checklist de lançamento.

## Corte recomendado para o MVP

O MVP corresponde às Sprints 0 a 5. Ele já permite vender de ponta a ponta com um gateway e medir o funil. Fallback, A/B, produto físico, cobrança automática, indicação e premiações entram depois que o núcleo transacional estiver estável.

## Decisões ainda abertas

- Nome e identidade visual próprios.
- Gateway que será integrado primeiro e acesso ao ambiente de homologação.
- Modelo de autenticação e provedor de e-mail/storage no ambiente final.
- Percentual e forma de cobrança da plataforma.
- Produto digital somente no MVP ou inclusão antecipada de produto físico.

Até essas escolhas serem feitas, a implementação pode usar o nome provisório `CheckoutV3`, produto digital e gateway simulado.
