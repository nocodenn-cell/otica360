# Ótica360 — Relatório de Auditoria (Etapa 0)

**Data:** 2026-10-19
**Branch de trabalho:** `feat/p0-producao` (a partir de `main` = `1ed8d1b`)
**Escopo:** auditoria e preparação, sem alterações em produção

---

## 1. Estrutura do repositório

O repositório `nocodenn-cell/otica360` possui **duas raízes**:

- **Raiz externa** (`C:\Naturecode\OTICA360`): esqueleto de sandbox. Contém apenas `app/`
  (repositório git aninhado) e um `package-lock.json` vazio (`"packages": {}`). O commit
  `bdddfd4` ("feat: implementar PWA + Code-Splitting") aqui é apenas um placeholder — **não
  contém implementação de PWA nem de code-splitting**.
- **`app/`**: a aplicação real (git aninhado). `origin` aponta para o mesmo repositório.

⚠️ A presença de um repositório git aninhado em `app/` é um risco de configuração: commits na
raiz externa não refletem a aplicação.

### Arquivos da aplicação (`app/`)

```
src/
  App.tsx, main.tsx, index.css, env.d.ts
  components/Layout.tsx
  contexts/AppContext.tsx
  pages/{Dashboard,Customers,CustomerDetail,Products,Sales,Leads,FollowUps,Messages,Marketing,Reports,Login}.tsx
  types/index.ts
  utils/{auth,format,storage}.ts
tests/{format,storage,commerce}.test.ts
supabase/migrations/001_initial_schema.sql
```

---

## 2. Estado verificado localmente (baseline)

| Verificação | Resultado |
|-------------|-----------|
| `npm ci` | OK (223 pacotes; 4 vulnerabilidades: 1 high, 3 moderate) |
| `npm test` (vitest) | **3 falhas / 55 aprovados** — idêntico ao CI do PR #2 |
| `npm run typecheck` | OK (sem erros) |
| `npm run build` | OK — bundle `index.js` 696 kB (aviso de chunk > 500 kB) |

As 3 falhas são todas em `formatCurrency`: o `Intl.NumberFormat('pt-BR')` usa **NBSP (U+00A0)**
entre `R$` e o valor, mas os testes esperavam espaço ASCII. Correção aplicada normalizando o
resultado (ver commit `660833a`).

---

## 3. Pull Requests

| PR | Título | Estado | Notas |
|----|--------|--------|-------|
| #1 | Master | MERGED | Base atual (`1ed8d1b`) |
| #2 | fix: robust CSV parsing and sales validation | DRAFT | CI vermelho por NBSP. **Incorporado** nesta branch |
| #3 | docs: plano de evolução | DRAFT | Apenas `PLANO.md`, documental |

### PR #2 — conteúdo revisado
- `src/utils/storage.ts`: parser CSV RFC-4180 (aspas, BOM, CRLF, multilinha), `saveState` propaga erro.
- `src/utils/saleValidation.ts` (novo): validação de itens/desconto.
- `src/contexts/AppContext.tsx`: persiste **antes** de confirmar sucesso; retorna boolean.
- `src/pages/Sales.tsx`: usa `validateSaleItems`.
- `.github/workflows/regression.yml` (novo): `npm ci` → `npm test` → typecheck → build.
- Testes de regressão adicionados.

**Observação:** o refactor de persistência do PR #2 corrige falhas silenciosas, mas a
integração com Supabase ainda exigirá refatoração (a persistência continua dentro do
AppContext, síncrona, em localStorage).

---

## 4. Versão implantada

- **Vercel Production**: `https://otica360-demo-2d3bf2fon-jinlong.vercel.app` @ `1ed8d1b`.
- **Vercel Preview**: @ `9d90696` (branch `master`).
- Projeto Vercel: `otica360-demo-*` (conta `jinlong`).

⚠️ O nome do projeto (`-demo`) indica que produção e demonstração podem estar no mesmo
ambiente. Isso viola o requisito de separação demo/produção (Etapa 2.3).

---

## 5. Configuração e variáveis de ambiente

- **Não existe** `.env` nem `.env.example` na aplicação.
- `src/env.d.ts` declara `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (opcionais).
- `isSupabaseConfigured()` retorna `false` → modo demo sempre ativo.
- **Não há projeto Supabase conectado.** A existência da migration SQL **não** implica banco ativo.

---

## 6. Vulnerabilidades de dependências (`npm audit`)

| Pacote | Severidade | Problema |
|--------|-----------|----------|
| `source-map-js` | **high** | DoS via offsets de source-map indexado |
| `react-router-dom` / `react-router` | moderate | Open redirect / XSS |
| `uuid` | moderate | Bounds check em v3/v5/v6 com `buf` |

Ação: avaliar bumps compatíveis (P1). Não misturar com correções críticas (regra 6).

---

## 7. Riscos priorizados

### Críticos (bloqueiam produção)
1. **R1 — App não renderiza:** `index.html:97` referencia `/src/main.jsx`; arquivo é `main.tsx`.
2. **R2 — Auth demonstrativa:** qualquer credencial entra; sessão forjável em localStorage.
3. **R3 — Persistência local:** dados no `localStorage` do navegador; sem multiempresa.
4. **R4 — Banco inexistente:** migration nunca aplicada.

### Altos
5. **R5 — Permissões não aplicadas:** `hasPermission` sem consumidores.
6. **R6 — RLS incompleto:** policies `FOR ALL` sem `WITH CHECK` (inserção com `organization_id` arbitrário).
7. **R7 — Sem tratamento de erro de rede/banco; toasts otimistas.**

### Médios
8. **R8 — Sem E2E; sem monitoramento de erros.**
9. **R9 — Vulnerabilidades de dependências.**
10. **R10 — Ausência de `vercel.json` (rewrites SPA).**

---

## 8. Dependências externas (requerem autorização)

| Dependência | Necessária para | Bloqueia |
|-------------|-----------------|----------|
| Projeto Supabase (URL + anon key) | Auth (1.2), dados (1.3), RLS (1.4) | Validação ponta a ponta do P0 |
| Acesso ao projeto Vercel | Variáveis de produção, deploy | Etapa 2.3 |
| `service_role` key (backend apenas) | Migração de dados, admin | Nunca no frontend |

---

## 9. Conclusões da Etapa 0

- Base de testes estabilizada (59/59) e PR #2 incorporado e corrigido.
- Existe um **bug de bloqueio total de renderização** (R1) — o app implantado provavelmente
  exibe tela branca. Recomenda-se corrigir imediatamente (baixo risco, alto impacto).
- O P0 1.2–1.4 depende de credenciais Supabase. É possível preparar **estrutura de código**
  (cliente, provider, guardas, camada de dados) sem credenciais, mas a **validação** depende
  do banco conectado.

**Próxima ação:** corrigir R1 e iniciar a estrutura de autenticação (1.2), solicitando
credenciais Supabase para validação.
