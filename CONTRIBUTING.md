# Guia de Contribuição 🤝

Obrigado por considerar contribuir com o Finance Shadow App! Este documento oferece as diretrizes para fazer contribuições ao projeto.

## Código de Conduta

- Seja respeitoso e inclusivo
- Dê crédito quando apropriado
- Reporte bugs de segurança em privado
- Foque em melhorar o projeto

## Como Começar

### 1. Fork o Repositório

Clique no botão "Fork" no GitHub para criar uma cópia sob sua conta.

### 2. Clone Seu Fork

```bash
git clone https://github.com/SEU_USERNAME/finance-shadow-app.git
cd finance-shadow-app
```

### 3. Adicione Upstream (Original)

```bash
git remote add upstream https://github.com/art-sec/finance-shadow-app.git
```

### 4. Crie uma Feature Branch

```bash
git checkout -b feature/minha-feature
```

## Processo de Contribuição

### Para Reportar um Bug

1. **Procure issues existentes** - Não duplicar
2. **Forneça detalhes:**
   - Versão do Node.js
   - Plataforma (Web/iOS/Android)
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots se aplicável

Exemplo de issue:

```
## Descrição
O login não funciona com emails que contêm + (mais).

## Passos para Reproduzir
1. Acessar tela de login
2. Digitar "user+tag@example.com"
3. Digitar senha
4. Clicar "Entrar"

## Erro Obtido
"Email inválido" mensagem de erro

## Comportamento Esperado
Deve permitir emails com + e fazer login normalmente

## Ambiente
- Node.js: 18.0.0
- Plataforma: Web
- Browser: Chrome 120
```

### Para Sugerir uma Feature

1. Use o template de "Feature Request"
2. Descreva o problema que resolve
3. Sugira a solução ou alternativas
4. Explique o caso de uso

Exemplo:

```
## Problema
É difícil rastrear despesas em múltiplas categorias.

## Solução
Adicionar tags/categorias aos gastos para melhor organização.

## Caso de Uso
Um usuário pode querer separar gastos de "Marketing" de "Operacional".
```

## Processo de Pull Request

### Antes de Submeter

```bash
# Atualize sua branch com upstream
git fetch upstream
git rebase upstream/main

# Instale dependências
npm install

# Rode testes (se houver)
npm test

# Teste a build
npm run web
```

### Estrutura do PR

1. **Título descritivo**
   ```
   ✅ Add dark mode toggle to settings
   🐛 Fix login with email containing plus sign
   📝 Update README with contributing guidelines
   ```

2. **Descrição completa**
   ```markdown
   ## Descrição
   Adiciona toggle para alternar entre tema claro e escuro.

   ## Mudanças
   - [ ] Adiciona componente ThemeToggle
   - [ ] Salva preferência no Firestore
   - [ ] Aplica tema globalmente

   ## Como Testar
   1. Abrir app
   2. Ir para Configurações
   3. Clicar no toggle de tema
   4. Verificar se tema mudou

   ## Screenshots
   [Cole screenshots se relevante]

   ## Checklist
   - [x] Código segue o padrão do projeto
   - [x] Testado em mobile/tablet/desktop
   - [x] Sem breaking changes
   - [x] Documentação atualizada
   ```

### Regras para PRs

- ✅ **Um PR = Uma feature/fix**
- ✅ **Commits pequenos e focados**
- ✅ **Mensagens de commit descritivas**
- ✅ **Sem código comentado**
- ✅ **Sem console.log em produção**
- ✅ **TypeScript sem erros**
- ✅ **Passa em todos os checks**

## Padrões de Código

### TypeScript

```typescript
// ✅ Sempre tipar
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Evitar any
function getUser(id: any): any {
  // ...
}
```

### Nomes

```typescript
// ✅ Descriptivo e em inglês
const calculateMonthlyTotal = () => {}
const isUserAuthenticated = true
const userPreferences = {}

// ❌ Abreviado ou não descritivo
const calcMthTot = () => {}
const isAuth = true
const prefs = {}
```

### Formatação

```typescript
// ✅ Consistent spacing
const data = {
  name: 'John',
  age: 30,
};

// ❌ Inconsistent
const data={name:'John',age:30}
```

### Arquivos

```
src/
├── components/
│   └── CustomButton.tsx    // Componente
├── screens/
│   └── DashboardScreen.tsx // Tela completa
├── services/
│   └── userService.ts      // Lógica de negócio
├── utils/
│   └── validation.ts       // Utilitários
└── types/
    └── index.ts            // Tipos TypeScript
```

## Documentação

Atualize documentação quando:
- Adiciona nova funcionalidade pública
- Muda comportamento existente
- Adiciona nova dependência
- Muda processo de setup

Arquivos a atualizar:
- `README.md` - Visão geral e setup
- `ARCHITECTURE.md` - Mudanças estruturais
- `DEVELOPMENT.md` - Guias técnicos
- Comentários no código - Explicações complexas

## Commits

### Mensagens

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - Nova funcionalidade
- `fix` - Correção de bug
- `docs` - Documentação
- `style` - Formatação (sem lógica)
- `refactor` - Refatoração
- `test` - Testes
- `chore` - Build, dependências

**Exemplos:**

```bash
git commit -m "feat(auth): add password reset functionality"
git commit -m "fix(dashboard): resolve chart rendering on mobile"
git commit -m "docs(readme): add Firebase setup instructions"
git commit -m "refactor(firestore): optimize user preference queries"
```

## Processo de Review

1. **Automático** - Testes passam?
2. **Humano** - Maintainers revisam
3. **Feedback** - Pediremos mudanças se necessário
4. **Aprovação** - Quando tudo está ✅
5. **Merge** - PR é merged!

## Dúvidas?

- 📖 Leia [DEVELOPMENT.md](DEVELOPMENT.md)
- 🏗️ Veja [ARCHITECTURE.md](ARCHITECTURE.md)
- 💬 Abra uma discussion
- 🐛 Reporte issues com detalhes

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença do projeto.

---

Obrigado por contribuir! 🎉
