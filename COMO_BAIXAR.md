# 📦 Como Baixar e Executar o Projeto Ateliê da Ótica

## 🌐 Situação Atual

O código está em um **ambiente de desenvolvimento online**. Para ter o projeto no seu computador, siga os passos abaixo.

---

## 🔽 Passo 1: Baixar os Arquivos

### Método A: Copiar Manualmente (Recomendado para agora)

1. **Crie uma pasta no seu computador:**
   ```bash
   mkdir atelie-da-otica
   cd atelie-da-otica
   ```

2. **Copie todos os arquivos listados abaixo** (veja a seção "Estrutura do Projeto")

3. **Ou use o botão de download** se disponível na interface web onde você está vendo este projeto

### Método B: Via Git (Se o projeto estiver no GitHub/GitLab)

Se o projeto já estiver em um repositório Git:

```bash
git clone URL_DO_REPOSITORIO
cd atelie-da-otica
```

---

## 🛠️ Passo 2: Instalar Dependências

Com o terminal aberto na pasta do projeto:

```bash
npm install
```

Isso vai instalar todas as dependências necessárias (React, TypeScript, Tailwind, etc.)

---

## 🚀 Passo 3: Executar o Projeto

### Modo Desenvolvimento (com hot-reload)
```bash
npm run dev
```

Acesse no navegador: **http://localhost:3000**

### Modo Produção (build otimizado)
```bash
npm run build
npm run preview
```

---

## 🧪 Passo 4: Executar Testes (Opcional)

```bash
npx vitest run
```

---

## 📁 Estrutura Completa do Projeto

```
atelie-da-otica/
│
├── 📄 index.html                      # Arquivo HTML principal
├── 📄 package.json                    # Dependências e scripts
├── 📄 package-lock.json               # Lock de versões
├── 📄 tsconfig.json                   # Configuração TypeScript
├── 📄 tsconfig.test.json              # Configuração TypeScript para testes
├── 📄 vite.config.js                  # Configuração Vite
├── 📄 vitest.config.ts                # Configuração Vitest
├── 📄 README.md                       # Documentação principal
├── 📄 AUDIT_REPORT.md                 # Relatório de auditoria
│
├── 📂 src/                            # Código fonte
│   ├── 📄 App.tsx                     # Componente raiz com rotas
│   ├── 📄 main.tsx                    # Ponto de entrada
│   ├── 📄 index.css                   # Estilos globais (Tailwind)
│   ├── 📄 env.d.ts                    # Tipos para variáveis de ambiente
│   │
│   ├── 📂 components/                 # Componentes reutilizáveis
│   │   └── 📄 Layout.tsx              # Layout principal (sidebar + header)
│   │
│   ├── 📂 contexts/                   # Contextos React
│   │   └── 📄 AppContext.tsx          # Estado global da aplicação
│   │
│   ├── 📂 pages/                      # Páginas da aplicação
│   │   ├── 📄 Login.tsx               # Tela de login
│   │   ├── 📄 Dashboard.tsx           # Dashboard com KPIs
│   │   ├── 📄 Customers.tsx           # Lista de clientes
│   │   ├── 📄 CustomerDetail.tsx      # Detalhes do cliente
│   │   ├── 📄 Products.tsx            # Gestão de produtos
│   │   ├── 📄 Sales.tsx               # Registro de vendas
│   │   ├── 📄 Leads.tsx               # Funil de leads/orçamentos
│   │   ├── 📄 FollowUps.tsx           # Tarefas de pós-venda
│   │   ├── 📄 Messages.tsx            # Mensagens (demo)
│   │   ├── 📄 Marketing.tsx           # Campanhas de marketing
│   │   └── 📄 Reports.tsx             # Relatórios e exportação
│   │
│   ├── 📂 types/                      # Definições TypeScript
│   │   └── 📄 index.ts                # Tipos de dados
│   │
│   └── 📂 utils/                      # Funções utilitárias
│       ├── 📄 format.ts               # Formatação (moeda, data, telefone)
│       ├── 📄 storage.ts              # Persistência e CRUD
│       └── 📄 auth.ts                 # Autenticação (demo)
│
├── 📂 supabase/                       # Schema do banco de dados
│   └── 📂 migrations/
│       └── 📄 001_initial_schema.sql  # Schema SQL completo
│
└── 📂 tests/                          # Testes unitários
    ├── 📄 format.test.ts              # Testes de formatação
    ├── 📄 storage.test.ts             # Testes de storage
    └── 📄 commerce.test.ts            # Testes de fluxo comercial
```

---

## ⚙️ Requisitos do Sistema

- **Node.js** versão 18 ou superior
- **npm** versão 9 ou superior
- **Navegador moderno** (Chrome, Firefox, Edge, Safari)

### Verificar versões instaladas:
```bash
node --version
npm --version
```

### Instalar Node.js (se necessário):
- Download: https://nodejs.org/
- Recomendo a versão LTS (Long Term Support)

---

## 🔐 Variáveis de Ambiente (Opcional)

Para usar Supabase (produção), crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**Sem essas variáveis, o sistema funciona em modo demonstração (localStorage).**

---

## 🎯 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento (http://localhost:3000) |
| `npm run build` | Gera build de produção (pasta `dist/`) |
| `npm run preview` | Visualiza build de produção |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npx vitest run` | Executa testes unitários |

---

## 🐛 Solução de Problemas

### Erro: "npm: command not found"
- Instale Node.js: https://nodejs.org/

### Erro: "Port 3000 already in use"
- Mude a porta em `vite.config.js` ou encerre o processo que está usando a porta

### Erro: "Module not found"
- Execute `npm install` novamente

### Tela em branco
- Abra o console do navegador (F12) e verifique erros
- Certifique-se de que `npm run dev` está rodando

---

## 📞 Suporte

Se tiver problemas para baixar ou executar o projeto:

1. Verifique se o Node.js está instalado
2. Execute `npm install` na pasta do projeto
3. Execute `npm run dev`
4. Acesse http://localhost:3000

---

## ✅ Checklist de Instalação

- [ ] Node.js instalado (v18+)
- [ ] Pasta do projeto criada
- [ ] Arquivos copiados/baixados
- [ ] `npm install` executado com sucesso
- [ ] `npm run dev` rodando
- [ ] http://localhost:3000 acessível no navegador

---

**Pronto!** Agora você tem o Ateliê da Ótica rodando no seu computador. 🎉
