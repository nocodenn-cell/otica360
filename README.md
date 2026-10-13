# ÓTICA360 — Sistema de Gestão Comercial para Óticas

## 📋 Visão Geral

Ótica360 é uma plataforma web completa para gestão comercial de óticas, desenvolvida para ajudar proprietários a organizar clientes, registrar vendas, acompanhar leads, gerenciar pós-venda e visualizar indicadores comerciais.

## 🏗️ Arquitetura

### Stack Tecnológica
- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS 4
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Roteamento**: React Router v6
- **Persistência**: localStorage (demo) / Supabase (produção)
- **Testes**: Vitest

### Estrutura de Diretórios
```
src/
├── components/       # Componentes reutilizáveis
│   └── Layout.tsx    # Layout principal com sidebar
├── contexts/         # Contextos React
│   └── AppContext.tsx # Estado global da aplicação
├── pages/            # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── Customers.tsx
│   ├── CustomerDetail.tsx
│   ├── Products.tsx
│   ├── Sales.tsx
│   ├── Leads.tsx
│   ├── FollowUps.tsx
│   ├── Messages.tsx
│   ├── Marketing.tsx
│   └── Reports.tsx
├── types/            # Definições de tipos TypeScript
│   └── index.ts
└── utils/            # Funções utilitárias
    ├── format.ts     # Formatação (moeda, data, telefone)
    ├── storage.ts    # Persistência e operações CRUD
    └── auth.ts       # Camada de autenticação
```

## ✅ Funcionalidades Implementadas

### MVP Funcional
1. ✅ **Dashboard Comercial** — KPIs em tempo real (faturamento, vendas, ticket médio, conversão)
2. ✅ **CRM de Clientes** — Cadastro, edição, busca, importação CSV, detecção de duplicatas
3. ✅ **Gestão de Produtos** — Armações, lentes, óculos de sol, acessórios, serviços
4. ✅ **Registro de Vendas** — Múltiplos itens, cálculo automático, formas de pagamento
5. ✅ **Funil de Leads** — Pipeline visual, conversão em cliente, criação de orçamentos
6. ✅ **Pós-venda** — Tarefas agendadas, filtros por status, alertas de atraso
7. ✅ **Mensagens** — Templates editáveis, modo demonstração identificado
8. ✅ **Marketing** — Registro de campanhas, cálculo de ROAS e CPL
9. ✅ **Relatórios** — Exportação CSV, filtros por período, "Minha Rotina"
10. ✅ **Histórico do Cliente** — Compras, orçamentos, tarefas de acompanhamento

### Critérios de Aceitação Atendidos
- [x] Cadastrar cliente
- [x] Importar clientes de planilha e visualizar erros
- [x] Cadastrar produtos
- [x] Registrar venda com vários itens
- [x] Consultar histórico comercial do cliente
- [x] Criar orçamento e acompanhar status
- [x] Criar tarefa de pós-venda com data definida
- [x] Visualizar tarefas pendentes e atrasadas
- [x] Dashboard calculado a partir de vendas reais
- [x] Registrar campanha e relacionar contatos/vendas
- [x] Consultar relatórios e exportar dados
- [x] Interface responsiva (desktop, tablet, celular)
- [x] Modo de teste claramente identificado (mensagens)

## 🔧 Como Executar

### Desenvolvimento
```bash
npm install
npm run dev
```

### Build de Produção
```bash
npm run build
```

### Testes
```bash
npx vitest run
```

### Verificação de Tipos
```bash
npm run typecheck
```

## 🗄️ Banco de Dados

### Schema SQL (Supabase)
O arquivo `supabase/migrations/001_initial_schema.sql` contém o schema completo para PostgreSQL com:
- Tabelas: organizations, profiles, customers, products, sales, sale_items, leads, quotes, quote_items, follow_up_tasks, message_templates, message_events, marketing_campaigns, audit_logs
- Row Level Security (RLS) em todas as tabelas
- Isolamento por organização
- Triggers para updated_at automático
- Views para dashboard (faturamento mensal, vendas por origem, conversão de leads)
- Função de auditoria

### Variáveis de Ambiente Necessárias
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

⚠️ **NUNCA** expor a `service_role` key no frontend.

## 🔐 Segurança e LGPD

### Implementado
- ✅ Tipos de dados sensíveis separados (comunicação, preferências)
- ✅ Status de autorização de comunicação (authorized, pending, declined, unsubscribed)
- ✅ Bloqueio de envio de mensagens para descadastrados
- ✅ Confirmação antes de operações destrutivas
- ✅ Validação de dados no cliente
- ✅ Detecção de duplicatas por telefone
- ✅ Isolamento por organização (preparado para RLS)
- ✅ Schema com permissões por função (owner, admin, operator, viewer)

### Pendente (requer Supabase)
- ⏳ Autenticação real com Supabase Auth
- ⏳ Aplicação de políticas RLS em produção
- ⏳ Registro de auditoria em operações críticas
- ⏳ Exportação restrita por permissão
- ⏳ Backup automático

### Dados de Saúde
O sistema **NÃO** armazena dados de receitas oftalmológicas ou informações médicas sensíveis. O campo "notes" é destinado apenas a observações comerciais.

## 📊 Modelo de Dados

### Entidades Principais
- **Organization** — Ótica/empresa
- **Profile** — Usuário com papel (owner, admin, operator, viewer)
- **Customer** — Cliente com origem, preferências e status de comunicação
- **Product** — Produto com categoria, preço e custo
- **Sale** — Venda com itens, pagamento e status
- **Lead** — Oportunidade com estágio no funil
- **Quote** — Orçamento vinculado a lead
- **FollowUpTask** — Tarefa de acompanhamento
- **MessageEvent** — Registro de envio de mensagem
- **MarketingCampaign** — Campanha com investimento e receita atribuída
- **AuditLog** — Registro de operações críticas

### Fórmulas de Cálculo
- **Ticket Médio** = Faturamento total / Quantidade de vendas válidas
- **Taxa de Conversão** = Leads ganhos / (Leads ganhos + Leads perdidos)
- **ROAS** = Receita atribuída / Investimento publicitário
- **CPL** = Investimento / Leads gerados

## 🚧 Pendências e Riscos Conhecidos

### Crítico (Bloqueia Produção)
1. **Autenticação real** — Atualmente em modo demo, qualquer pessoa acessa tudo
2. **Backend Supabase** — Dados em localStorage não são adequados para produção
3. **Integração WhatsApp** — Modo demonstração, não envia mensagens reais

### Alto (Afeta Funcionalidade)
4. **Testes de integração** — Testes unitários criados, mas sem testes de UI
5. **Code-splitting** — Bundle de 691KB, precisa otimizar
6. **Validação no servidor** — Atualmente apenas no cliente

### Médio (Melhorias)
7. **Importação de produtos** — Apenas clientes podem ser importados via CSV
8. **Metas comerciais** — Tipo existe mas não há interface
9. **Resumo semanal** — Planejado mas não implementado
10. **Integrações de marketing** — Google Ads e Meta Ads preparados mas não conectados

### Baixo (Cosmético)
11. **Tema escuro** — Não implementado
12. **PWA** — Não configurado
13. **Internacionalização** — Apenas português brasileiro

## 🎯 Próximas 3 Prioridades

### 1. Implementar Autenticação Real com Supabase
- Configurar projeto Supabase
- Executar migração SQL
- Substituir auth.ts por chamadas reais ao Supabase Auth
- Testar login/logout e isolamento de organizações

### 2. Migrar Persistência para Supabase
- Criar camada de acesso a dados (data access layer)
- Substituir localStorage por chamadas ao Supabase Client
- Implementar cache local para offline
- Testar CRUD completo com RLS ativo

### 3. Integrar WhatsApp Business API
- Escolher provedor autorizado (Twilio, Z-API, etc.)
- Implementar adapter pattern para troca de provedor
- Configurar webhooks para recebimento de mensagens
- Testar envio real em ambiente de sandbox

## 📝 Licença

Projeto proprietário. Todos os direitos reservados.

## 🤝 Contribuição

Este é um projeto interno. Para dúvidas ou sugestões, contate a equipe de desenvolvimento.

---

**Versão**: 1.0.0  
**Data**: Janeiro 2026  
**Status**: MVP funcional (demo) — Pronto para piloto após implementação de autenticação e backend
