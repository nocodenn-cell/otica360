# Ótica360 — Roadmap de Execução e Preparação para Produção SaaS

**Repositório:** https://github.com/nocodenn-cell/otica360
**Branch de trabalho:** `feat/p0-producao`
**Data da auditoria inicial:** 2026-10-19
**Responsável técnico:** Engineering Loop

> Este roadmap reflete o andamento real. Status: `[ ]` pendente · `[~]` em andamento · `[x]` concluído · `[!]` bloqueado.

---

## ETAPA 0 — AUDITORIA E PREPARAÇÃO

- [x] Verificar estrutura atual do repositório
- [x] Ler `README.md` e `AUDIT_REPORT.md`
- [x] Analisar PRs #2 e #3
- [x] Inspecionar testes e workflow do GitHub Actions
- [x] Identificar versão efetivamente implantada
- [x] Verificar dependências, configurações e variáveis de ambiente
- [x] Criar branch de trabalho (`feat/p0-producao`)
- [x] Elaborar relatório inicial de riscos e dependências (ver `AUDIT_STAGE0.md`)

### Achados da Etapa 0

**Estado do repositório**
- O repositório contém duas raízes: a raiz externa (esqueleto de sandbox: `app/` + `package-lock.json` vazio) e `app/` (aplicação real, repositório git aninhado).
- Branch `main` = `1ed8d1b` (merge do PR #1). A produção na Vercel aponta para `1ed8d1b`.
- Build local reproduzido: `npm ci` OK, `npm run typecheck` OK, `npm run build` OK (bundle 696 kB), `npm test` = **3 falhas / 55 aprovados** (idêntico ao CI do PR #2).

**PRs**
- PR #1 — mergeado (base atual).
- PR #2 (`fix/regression-csv-storage-sales`, draft) — parser CSV robusto, validação de vendas, propagação de falha de persistência, workflow de CI. CI **falhava** por 3 erros de NBSP em `formatCurrency`. **Incorporado nesta branch via merge** (commit `65affcf`) com a correção dos testes (commit `660833a`).
- PR #3 (draft) — apenas `PLANO.md`, documental.

**Versão implantada**
- Vercel (Production): `https://otica360-demo-2d3bf2fon-jinlong.vercel.app` no SHA `1ed8d1b`.

### Riscos críticos identificados (bloqueiam produção)

| # | Risco | Severidade | Evidência |
|---|-------|-----------|-----------|
| R1 | `index.html` referencia `/src/main.jsx`, mas o arquivo é `main.tsx` → app não renderiza (tela branca) em produção | **Crítico** | `app/index.html:97` vs `app/src/main.tsx` |
| R2 | Autenticação demonstrativa: qualquer e-mail/senha entra; sessão em `localStorage`; sem Supabase Auth | **Crítico** | `src/utils/auth.ts`, `src/pages/Login.tsx` |
| R3 | Todos os dados em `localStorage`; `organizationId` fixo `org-default`; sem isolamento multiempresa | **Crítico** | `src/utils/storage.ts:7`, `src/contexts/AppContext.tsx` |
| R4 | Migration `001_initial_schema.sql` nunca aplicada; nenhuma tabela existe em produção | **Crítico** | Não há `.env`, nem projeto Supabase conectado |
| R5 | Controle de acesso (`hasPermission`) existe mas **não é usado** em nenhuma tela | Alto | `src/utils/auth.ts` (sem consumidores) |
| R6 | RLS: policies `FOR ALL` sem `WITH CHECK` permitem inserir `organization_id` arbitrário | Alto | `001_initial_schema.sql:329-418` |
| R7 | Sem tratamento de erro de rede/Supabase; operações otimistas com toasts imediatos | Alto | `src/contexts/AppContext.tsx` |
| R8 | Sem testes E2E; sem monitoramento de erros | Médio | — |
| R9 | 4 vulnerabilidades de dependências (1 high: `source-map-js`; 3 moderate: `react-router-dom`, `uuid`) | Médio | `npm audit` |
| R10 | Vercel sem `vercel.json` (sem rewrites SPA explícitos) | Médio | 404 em `vercel.json` |

**Dependências externas necessárias (requerem autorização)**
- Projeto Supabase (URL + anon key) para Auth e PostgreSQL.
- Credenciais de deploy Vercel (ou acesso ao projeto existente).
- `service_role` key (uso restrita a backend/scripts — **nunca** no frontend).

---

## ETAPA 1 — PRIORIDADE P0: CORREÇÕES CRÍTICAS

### 1.1 Corrigir testes automatizados — `[x]`
- [x] Investigar `tests/format.test.ts`
- [x] Corrigir incompatibilidade preservando formatação BRL (normalização de NBSP U+00A0)
- [x] Revisar alterações do PR #2 (mergeadas)
- [x] Validar importação/exportação CSV (6 testes de regressão)
- [x] Validar quantidade, preço e desconto nas vendas (5 testes `saleValidation`)
- [x] `npm ci` OK
- [x] `npm test` → **59/59 aprovados**
- [x] `npm run typecheck` OK
- [x] `npm run build` OK

### 1.2 Implementar autenticação real (Supabase Auth) — `[ ]`
- [ ] Integrar Supabase Auth
- [ ] Login por e-mail e senha
- [ ] Logout seguro
- [ ] Restaurar sessões válidas (`onAuthStateChange`)
- [ ] Impedir acesso sem autenticação
- [ ] Recuperação de senha
- [ ] Aplicar permissões por usuário (usar `hasPermission` nas telas)
- [ ] Remover autenticação demonstrativa do ambiente de produção

### 1.3 Integrar PostgreSQL/Supabase — `[ ]`
- [ ] Auditar a migração SQL antes de aplicar
- [ ] Verificar tabelas, relacionamentos e constraints
- [ ] Preparar cliente Supabase no frontend (apenas anon key)
- [ ] Criar camada de acesso a dados (`src/services/`)
- [ ] Migrar CRUD de clientes, produtos, vendas, leads, orçamentos e pós-venda
- [ ] Tratamento explícito de falhas
- [ ] Confirmar sucesso só após persistência confirmada
- [ ] Planejar migração dos dados existentes (sem apagá-los)
- [ ] Validar integridade de vendas e itens
- [ ] Preservar comportamento existente

### 1.4 Garantir isolamento entre óticas (RLS) — `[ ]`
- [ ] Organizações independentes
- [ ] Vincular usuários às organizações corretas
- [ ] Aplicar RLS
- [ ] Validar owner/admin/operator/viewer
- [ ] Testar isolamento de leitura/criação/edição/exclusão
- [ ] Testar acesso indevido por IDs de outras organizações
- [ ] Impedir alteração arbitrária de `organization_id`
- [ ] Isolamento em relatórios e exportações

---

## ETAPA 2 — PRIORIDADE P1: CONFIABILIDADE

### 2.1 Persistência, backup e recuperação — `[ ]`
- [ ] Tratamento de erros de rede e banco
- [ ] Impedir mensagens de sucesso falsas
- [ ] Validar duplicidade e integridade
- [ ] Estratégia de backup compatível com o plano
- [ ] Documentar restauração
- [ ] Testar recuperação em ambiente isolado
- [ ] Operações críticas sem inconsistências

### 2.2 Testes ponta a ponta — `[ ]`
- [ ] Login e logout
- [ ] Cadastro/edição de clientes
- [ ] Cadastro de produtos
- [ ] Registro/cancelamento de vendas
- [ ] Criação de orçamentos
- [ ] Gestão de leads
- [ ] Pós-venda
- [ ] Relatórios
- [ ] Permissões e isolamento entre óticas
- [ ] Falhas de persistência
- [ ] Acesso de outro dispositivo

### 2.3 Implantação e monitoramento — `[ ]`
- [ ] Revisar configuração Vercel
- [ ] Validar variáveis de ambiente
- [ ] Segredos administrativos não expostos
- [ ] Ambiente de demonstração separado da produção
- [ ] Redirecionamentos das rotas React (SPA rewrites)
- [ ] Monitoramento básico de erros
- [ ] Documentar implantação e reversão

---

## ETAPA 3 — PRIORIDADE P2: PREPARAÇÃO COMERCIAL

### 3.1 SaaS multiempresa — `[ ]`
- [ ] Processo de criação de novas óticas
- [ ] Ativação/desativação de organizações
- [ ] Administração de usuários por loja
- [ ] Estados de assinatura (teste, ativa, vencida, suspensa)
- [ ] Modelo de cobrança mensal (sem cobrança real sem autorização)
- [ ] Arquitetura multi-tenant

### 3.2 Demonstração comercial — `[ ]`
- [ ] Ambiente com dados fictícios
- [ ] Separar demonstração de dados reais
- [ ] Validar todos os módulos
- [ ] Responsividade desktop/celular
- [ ] Procedimento de demonstração

### 3.3 Integrações futuras — `[ ]`
- [ ] WhatsApp Business API oficial
- [ ] Automação de pós-venda
- [ ] Lembretes de atendimento
- [ ] Indicadores comerciais avançados
- [ ] Importação de produtos via CSV

---

## Registro de commits (branch `feat/p0-producao`)

| Commit | Descrição |
|--------|-----------|
| `65affcf` | merge: incorpora correções de regressão do PR #2 (CSV, validação de vendas, CI) |
| `660833a` | fix(tests): alinha expectativa de moeda BRL com NBSP preservando formatação |

---

## Próxima ação recomendada

Concluir **Etapa 1.2 (autenticação real)**. Decisão de bloqueio: requer um projeto Supabase
(URL + anon key) e autorização. Sem credenciais, é possível avançar na **estrutura de código**
(cliente Supabase, provedor de auth, guarda de rotas, camada de dados e correção R6/R1),
mas a validação ponta a ponta só ocorre com o banco conectado.
