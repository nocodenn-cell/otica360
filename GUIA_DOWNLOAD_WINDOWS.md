# 📥 GUIA COMPLETO: Como Baixar o Projeto Ateliê da Ótica no Windows

## ⚠️ IMPORTANTE

O projeto está em um ambiente web (sandbox). Você precisa copiar os arquivos manualmente para seu computador.

---

## 🎯 MÉTODO RECOMENDADO: Copiar via Interface Web

### Passo 1: Verificar se há botão de download

Na interface web onde você está vendo este projeto, procure por:
- Botão "Download" ou "Baixar"
- Ícone de download (⬇️)
- Menu com opção "Exportar projeto"

**Se existir**, clique e baixe o ZIP. Pule para "Passo 4: Instalar e Executar".

---

### Passo 2: Copiar arquivos manualmente (se não houver download)

#### 2.1. Criar a pasta do projeto

1. Abra o **Explorador de Arquivos** do Windows
2. Navegue até onde você quer salvar o projeto (ex: `C:\Projetos` ou `Documentos`)
3. Clique com botão direito > **Novo** > **Pasta**
4. Nomeie como: `atelie-da-otica`
5. Abra a pasta

#### 2.2. Copiar cada arquivo

Para cada arquivo listado abaixo:

1. **Clique no nome do arquivo** na interface web para abrir
2. **Selecione todo o conteúdo** (Ctrl+A)
3. **Copie** (Ctrl+C)
4. **No Windows**, crie o arquivo correspondente:
   - Clique com botão direito na pasta `atelie-da-otica`
   - **Novo** > **Documento de Texto**
   - Nomeie exatamente como o arquivo original (ex: `App.tsx`)
   - **IMPORTANTE**: Remova a extensão `.txt`!
     - Se o Windows avisar "O arquivo pode ficar inutilizável", clique em **Sim**
5. **Abra o arquivo** com o Bloco de Notas ou VS Code
6. **Cole o conteúdo** (Ctrl+V)
7. **Salve** (Ctrl+S)

---

### Passo 3: Lista Completa de Arquivos

#### 📁 Arquivos na RAIZ do projeto:

```
index.html
package.json
package-lock.json
tsconfig.json
tsconfig.test.json
vite.config.js
vitest.config.ts
README.md
AUDIT_REPORT.md
COMO_BAIXAR.md
criar-zip.ps1
```

#### 📁 Pasta `src/`:

Crie a pasta `src` dentro de `atelie-da-otica` e copie:

```
src/App.tsx
src/main.tsx
src/index.css
src/env.d.ts
```

#### 📁 Pasta `src/components/`:

Crie a pasta `components` dentro de `src`:

```
src/components/Layout.tsx
```

#### 📁 Pasta `src/contexts/`:

Crie a pasta `contexts` dentro de `src`:

```
src/contexts/AppContext.tsx
```

#### 📁 Pasta `src/pages/`:

Crie a pasta `pages` dentro de `src`:

```
src/pages/Login.tsx
src/pages/Dashboard.tsx
src/pages/Customers.tsx
src/pages/CustomerDetail.tsx
src/pages/Products.tsx
src/pages/Sales.tsx
src/pages/Leads.tsx
src/pages/FollowUps.tsx
src/pages/Messages.tsx
src/pages/Marketing.tsx
src/pages/Reports.tsx
```

#### 📁 Pasta `src/types/`:

Crie a pasta `types` dentro de `src`:

```
src/types/index.ts
```

#### 📁 Pasta `src/utils/`:

Crie a pasta `utils` dentro de `src`:

```
src/utils/format.ts
src/utils/storage.ts
src/utils/auth.ts
```

#### 📁 Pasta `supabase/migrations/`:

Crie as pastas `supabase` e `migrations`:

```
supabase/migrations/001_initial_schema.sql
```

#### 📁 Pasta `tests/`:

Crie a pasta `tests`:

```
tests/format.test.ts
tests/storage.test.ts
tests/commerce.test.ts
```

---

### Passo 4: Instalar e Executar o Projeto

#### 4.1. Instalar Node.js (se ainda não tiver)

1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS** (recomendada)
3. Execute o instalador
4. Clique em "Next" até finalizar
5. **Feche e abra o PowerShell** para aplicar as mudanças

#### 4.2. Verificar instalação

Abra o **PowerShell** e digite:

```powershell
node --version
npm --version
```

Deve mostrar algo como:
```
v20.10.0
10.2.3
```

#### 4.3. Navegar até a pasta do projeto

No PowerShell:

```powershell
cd C:\caminho\para\atelie-da-otica
```

Exemplo:
```powershell
cd C:\Users\SeuNome\Documents\atelie-da-otica
```

#### 4.4. Instalar dependências

```powershell
npm install
```

Aguarde alguns minutos. Vai criar a pasta `node_modules`.

#### 4.5. Executar o projeto

```powershell
npm run dev
```

Deve aparecer:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

#### 4.6. Abrir no navegador

Acesse: **http://localhost:3000**

Pronto! O sistema está rodando! 🎉

---

## 🐛 Solução de Problemas

### Erro: "npm não é reconhecido"

**Causa**: Node.js não está instalado ou não foi adicionado ao PATH

**Solução**:
1. Reinstale o Node.js: https://nodejs.org/
2. Marque a opção "Add to PATH" durante a instalação
3. Feche e abra o PowerShell novamente

---

### Erro: "Cannot find module"

**Causa**: Dependências não foram instaladas

**Solução**:
```powershell
npm install
```

---

### Erro: "Port 3000 already in use"

**Causa**: Outra aplicação está usando a porta 3000

**Solução**:
1. Encerre o outro programa OU
2. Edite `vite.config.js` e mude a porta:
   ```javascript
   export default defineConfig({
     server: {
       port: 3001
     }
   })
   ```

---

### Tela em branco no navegador

**Causa**: Erro JavaScript

**Solução**:
1. Abra o console do navegador (F12)
2. Veja se há erros em vermelho
3. Verifique se todos os arquivos foram copiados corretamente
4. Execute `npm run dev` novamente

---

### Arquivos com extensão .txt

**Causa**: Windows adicionou `.txt` automaticamente

**Solução**:
1. No Explorador de Arquivos, clique em **Exibir** > **Extensões de nomes de arquivos**
2. Renomeie os arquivos removendo `.txt`
   - Exemplo: `App.tsx.txt` → `App.tsx`

---

## ✅ Checklist Final

Antes de executar, verifique:

- [ ] Node.js instalado (v18+)
- [ ] Pasta `atelie-da-otica` criada
- [ ] Todos os arquivos copiados (35+ arquivos)
- [ ] Estrutura de pastas correta (`src/`, `src/pages/`, etc.)
- [ ] Extensões dos arquivos corretas (`.tsx`, `.ts`, `.json`, etc.)
- [ ] PowerShell aberto na pasta do projeto
- [ ] `npm install` executado com sucesso
- [ ] `npm run dev` rodando
- [ ] http://localhost:3000 acessível

---

## 📞 Precisa de Ajuda?

Se tiver problemas:

1. Verifique se o Node.js está instalado
2. Confirme que todos os arquivos foram copiados
3. Execute `npm install` novamente
4. Tente `npm run dev`

Se o erro persistir, me envie a mensagem de erro exata que aparece no PowerShell.

---

**Boa sorte! O projeto vale a pena!** 🚀
