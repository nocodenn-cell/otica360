# Plano de evolução do Ótica360 — execução assistida por Claude Code

**Preparado em:** 2026-10-13  
**Janela desejada:** 2026-10-14 às 10:00 (fuso horário a confirmar)  
**Status:** planejamento; nenhuma execução automática garantida  
**Repositório:** nocodenn-cell/otica360

> **Instrução ao Claude Code:** leia este documento antes de alterar arquivos. Execute em branch própria a partir da main atualizada; não faça merge sem testes e aprovação. Preserve a versão local usada na demonstração ao cliente.

## 0. Situação atual verificada
- Frontend React 18, TypeScript, Vite e Tailwind.
- `src/utils/auth.ts` usa autenticação demonstrativa: qualquer e-mail com senha ignorada gera perfil admin; NÃO é autenticação para produção.
- `src/utils/storage.ts` persiste dados em localStorage: não compartilha dados entre computadores, não oferece backup confiável e pode falhar por cota.
- `src/contexts/AppContext.tsx` na main persiste dentro do reducer e mostra notificações de sucesso imediatamente.
- Migração SQL Supabase existe, mas autenticação, isolamento por organização e políticas RLS precisam de auditoria antes de implantação.
- PR #2 (`fix/regression-csv-storage-sales`) contém correções parciais e workflow de CI. Verificar seu status, logs e alterações antes de reaproveitar ou integrar. Não assumir que está aprovado.
- O sistema será demonstrado localmente antes de futura hospedagem na Vercel.

## 1. Objetivo
Entregar um Ótica360 seguro, confiável e adequado ao uso diário de uma ótica, mantendo boa experiência em celular e desktop. Priorizar integridade de dados, segurança e fluxos comerciais reais antes de novas funcionalidades.

## 2. Prioridades e tarefas

### P0 — Qualidade, persistência e estabilidade
1. Examinar PR #2, reproduzir a falha de `npm test`, corrigir causas e executar `npm ci`, `npm test`, `npm run typecheck`, `npm run build`.
2. Refatorar `AppContext`: reducers puros; persistir antes de confirmar sucesso; capturar erros; preservar alterações consecutivas sem estado obsoleto; testar falha de quota e recuperação.
3. Testar importação/exportação CSV com vírgulas, aspas, quebras de linha, BOM, colunas inconsistentes e arquivos vazios. Validar importação de clientes e impedir confirmação enganosa.
4. Centralizar validações de venda: quantidade inteira positiva, descontos válidos, itens existentes/ativos, cliente referenciado válido quando informado, valores calculados de modo consistente.
5. Adicionar CI com testes, typecheck e build obrigatórios; não fazer merge se alguma etapa falhar.
**Aceite:** testes verdes, sem regressões nos fluxos de cliente/produto/orçamento/venda e mensagens de erro honestas.

### P0 — Segurança antes de publicar
1. Substituir login demo por Supabase Auth em produção; modo demo só quando explicitamente habilitado em ambiente de desenvolvimento.
2. Auditar políticas RLS, especialmente consultas de `profiles` dentro de policies da própria tabela, privilégios de papéis e isolamento por `organization_id`.
3. Testar acesso cruzado entre duas organizações com usuários de papéis diferentes; negar acesso não autorizado.
4. Nunca colocar `service_role` ou segredos no bundle Vite. Documentar variáveis públicas e configuração Vercel.
**Aceite:** testes de autorização e isolamento aprovados; nenhum acesso admin implícito no ambiente publicado.

### P1 — Dados e implantação
1. Criar camada de repositórios/serviços para Supabase com estados de loading/erro e tratamento de concorrência.
2. Planejar migração dos dados de demonstração localStorage → Supabase: exportação, backup, importação idempotente, validação, deduplicação e rollback; NÃO migrar dados reais sem consentimento.
3. Configurar preview deployments na Vercel e ambientes separados (desenvolvimento, homologação, produção).
4. Documentar instalação, seed fictício, backup/restauração e procedimento de recuperação.
**Aceite:** acesso entre dispositivos para mesma organização e isolamento entre organizações, com rollback documentado.

### P1 — Experiência do dono da ótica
1. Dashboard com faturamento por período, ticket médio, vendas por canal, orçamentos pendentes e acompanhamento de clientes.
2. Fluxo rápido de balcão: localizar cliente → produto → orçamento → venda → pós-venda, com mensagens claras e sem cliques desnecessários.
3. Melhorar filtros, buscas, acessibilidade, estados vazios e responsividade.
4. Diferenciar dados de demonstração de dados reais; evitar indicadores enganosos.
**Aceite:** jornada completa testada manualmente em desktop e celular, com dados fictícios.

### P2 — Evoluções posteriores, somente após P0/P1
- Controle de estoque com movimentações auditáveis.
- Ordens de serviço e acompanhamento de lentes/armações.
- Histórico de atendimento e lembretes com consentimento.
- Relatórios e exportações, respeitando permissões.
- Auditoria de alterações relevantes e política de retenção de dados.

## 3. Procedimento de execução para Claude Code
1. Ler `README.md`, `AUDIT_REPORT.md`, `package.json`, `src/contexts/AppContext.tsx`, `src/utils/storage.ts`, `src/utils/auth.ts`, `src/pages/Sales.tsx`, `src/pages/Customers.tsx`, `supabase/migrations/` e testes.
2. Inspecionar status de PR #2 e logs do GitHub Actions. Identificar falhas reais antes de codificar.
3. Abrir uma branch de implementação `fix/estabilizacao-otica360` a partir da main atualizada; selecionar mudanças do PR #2 somente após revisão para evitar duplicação/conflitos.
4. Implementar **primeiro P0 de estabilidade**, em commits pequenos, com testes de regressão; registrar decisões técnicas.
5. Executar `npm ci && npm test && npm run typecheck && npm run build` e testes manuais essenciais. Registrar comandos, contagem de testes e erros reais.
6. Criar PR com resumo, riscos, screenshots quando pertinente, instruções de teste e checklist. **Não fazer merge automaticamente** sem verificações verdes e autorização.
7. Segurança/Supabase e migração de dados exigem etapa e PR separados; nunca aplicar migrations em produção sem backup, revisão de RLS e aprovação explícita.
8. Não alterar a instalação local usada na demonstração do cliente; evitar expor dados reais nos testes ou logs.

## 4. Testes de regressão obrigatórios
- Falha de `localStorage.setItem` não confirma operação e não perde estado anterior.
- Duas gravações consecutivas preservam ambas.
- CSV com aspas, vírgulas, multilinhas, BOM e colunas inconsistentes.
- Venda com quantidade 0/negativa/fracionária, desconto negativo ou maior que subtotal, produto inexistente/inativo e cliente inexistente.
- Venda válida e atualização de histórico do cliente.
- Acesso negado entre organizações e por perfil sem permissão (fase Supabase).
- Smoke test de login, clientes, produtos, orçamento, venda e dashboard.

## 5. Entregáveis
- PR de estabilização com CI verde, testes e documentação.
- Lista de problemas corrigidos, problemas ainda abertos e riscos conhecidos.
- Plano de implantação Vercel/Supabase com checklist de segurança e migração.
- Guia de demonstração local, sem depender de ambiente de produção.

## 6. Critério de conclusão
Não declarar a tarefa concluída apenas porque o código foi alterado. Exigir evidência de testes e build verdes, revisão do diff, ausência de segredos, proteção dos dados existentes e PR pronto para revisão. Qualquer falha deve ser documentada e bloquear o merge.
