# Guia de Segurança de Variáveis de Ambiente 🔒

Guia completo sobre como proteger dados sensíveis do seu aplicativo.

## O Problema

Dados sensíveis como API keys, senhas e tokens **NUNCA** devem estar no código-fonte ou repositório Git.

```
❌ ERRADO - Dados expostos no repositório
const apiKey = "AIzaSyDlXt_TkfwJLMO_i4_aN5DWWKktJqP6pRQ";

✅ CORRETO - Dados em variáveis de ambiente
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
```

---

## Tipos de Dados

### 1️⃣ Dados PÚBLICOS (Safe to Expose)

Pode colocar em `.env.local` e `.env.example`:

- ✅ Firebase API Key
- ✅ Firebase Auth Domain
- ✅ Firebase Project ID
- ✅ URLs públicas
- ✅ Feature flags
- ✅ Domínios CORS

**Por quê?** Firebase protege dados via Security Rules, não via chaves secretas.

```javascript
// Seguro - Protegido por Firebase Security Rules
const config = {
  apiKey: "AIzaSy...", // Público, mas protegido por regras
  projectId: "meu-projeto",
};
```

### 2️⃣ Dados PRIVADOS (Nunca Expose)

**NUNCA** coloque em repositório:

- ❌ Firebase Admin SDK credentials
- ❌ Database connection strings
- ❌ API keys backend/admin
- ❌ Senhas de usuários
- ❌ Tokens JWT/auth
- ❌ Credenciais de banco de dados
- ❌ Chaves de pagamento
- ❌ Chaves OpenAI/LLM

```javascript
// ❌ NUNCA faça isso no código
const adminKey = "AIzaSy_SECRET_ADMIN_KEY_...";

// ✅ Se precisa, use backend e variáveis de ambiente
const adminKey = process.env.FIREBASE_ADMIN_KEY; // Apenas no servidor
```

### 3️⃣ Dados SENSÍVEIS Específicos

Dados que parecem públicos mas são sensíveis:

- ⚠️ URLs de API backend (pode revelar infraestrutura)
- ⚠️ Versões de software (facilita exploração)
- ⚠️ User IDs internos
- ⚠️ Database schemas

---

## Estrutura de Arquivos Correta

```
projeto/
├── .env.example           ✅ Versionado no Git (sem valores reais)
├── .env.local            ❌ NÃO versionado (valores reais)
├── .env.development      ✅ Opcional, para dev (no Git)
├── .env.production       ✅ Opcional, referência (no Git)
├── .gitignore            ✅ Lista .env* acho seguro
├── src/
│   └── firebase/
│       └── config.ts     ✅ Usa process.env.EXPO_PUBLIC_*
└── vercel.json           ✅ Configuração (sem secrets)
```

### .gitignore (Essencial)

```
# Environment variables - NUNCA COMMITAR
.env
.env.local
.env.*.local
.env.development.local
.env.production.local
.env.test.local
```

---

## Como Usar Variáveis de Ambiente

### Local Development

**1. Copiar template**

```bash
cp .env.example .env.local
```

**2. Editar `.env.local`**

```bash
# Abrir em editor
nano .env.local
# ou
code .env.local
```

**3. Preencher com valores reais**

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDlXt_TkfwJLMO_i4_aN5DWWKktJqP6pRQ
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=shadow-corp-finances-app.firebaseapp.com
...
```

**4. Usar no código**

```typescript
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
```

**5. Git não verá o arquivo**

```bash
git status
# ✅ .env.local não aparece (está em .gitignore)
```

### Produção (Vercel)

**1. Ir para Dashboard Vercel**

```
https://vercel.com/dashboard
```

**2. Clique no seu projeto**

**3. Project Settings > "Environment Variables"**

**4. Adicione cada variável**

```
Name: EXPO_PUBLIC_FIREBASE_API_KEY
Value: AIzaSyDlXt_TkfwJLMO_i4_aN5DWWKktJqP6pRQ
Environments: Production, Preview, Development
```

**5. Clique "Save"**

Vercel usa essas variáveis durante o build e em runtime.

---

## Exemplo Prático

### ❌ INSEGURO

```typescript
// config.ts - EXPOSIÇÃO DE DADOS
const firebaseConfig = {
  apiKey: 'AIzaSyDlXt_TkfwJLMO_i4_aN5DWWKktJqP6pRQ',
  authDomain: 'shadow-corp-finances-app.firebaseapp.com',
  projectId: 'shadow-corp-finances-app',
  // ... commitado no Git!
};
```

**Problema:** Qualquer um vendo seu histórico Git tem acesso.

### ✅ SEGURO

```typescript
// .env.local (não commitado)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDlXt_TkfwJLMO_i4_aN5DWWKktJqP6pRQ

// config.ts
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};
```

**Benefício:** Variáveis carregadas em runtime, não no código.

---

## Checklist de Segurança

### Antes de Commitar

- [ ] `.env` está em `.gitignore`?
- [ ] Arquivo `.env.local` existe localmente?
- [ ] `.env.local` não foi commitado? (`git log --all` não mostra)
- [ ] `.env.example` não tem valores reais?
- [ ] Código usa `process.env.*` para valores sensíveis?

### Antes de Deploy

- [ ] Todas as variáveis estão no Dashboard Vercel?
- [ ] Nenhuma variável sensível está no código?
- [ ] `vercel.json` não tem secrets?
- [ ] README explica como configurar?

### Em Produção

- [ ] Analytics/logs não expõem variáveis de ambiente?
- [ ] Error messages não mostram valores sensíveis?
- [ ] CDN não cacheia páginas com dados sensíveis?

---

## Acidente? Dados Vazaram?

Se você acidentalmente commitou dados sensíveis:

**1. Imediatamente remova do repositório**

```bash
# Remove arquivo do histórico Git
git filter-branch --tree-filter 'rm -f .env' --prune-empty HEAD

# Force push (cuidado - reescreve histórico)
git push origin main --force
```

**2. Regenere credenciais**

- Firebase: Crie novas chaves
- Senhas: Troque todas as senhas
- Tokens: Revogue tokens antigos
- API Keys: Delete e crie novas

**3. Monitore**

- Procure por uso unauthorized
- Ative alertas no Firebase
- Revise logs de acesso

---

## Ferramentas de Segurança

### Verificar Commits para Secrets

```bash
# Instalar git-secrets
brew install git-secrets

# Configurar hook
git secrets --install
git secrets --register-aws

# Verificar histórico
git secrets --scan
```

### Verificar código automaticamente

```bash
# Instalar nodemon (monitora mudanças)
npm install --save-dev nodemon

# Ou usar pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint"
```

### Vercel Secret Scanning

Vercel detecta secrets automaticamente:
- Chaves privadas
- Tokens de acesso
- Credenciais de banco de dados

Se encontrar, mostra aviso em PR.

---

## Environment Variables por Plataforma

### Local (npm run web)

Carrega de: `.env`, `.env.local`, `.env.development`, `.env.development.local`

```bash
npm run web
# ✅ Usa variáveis do .env.local
```

### Vercel (Produção)

Carrega de: URL do Dashboard + variáveis setadas

```bash
git push origin main
# ✅ Vercel usa variáveis do Dashboard
```

### GitHub Actions (CI/CD)

Carrega de: GitHub Secrets

```yaml
env:
  EXPO_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
```

---

## Boas Práticas

### ✅ DO's

- ✅ Use prefixo `EXPO_PUBLIC_` para variáveis públicas
- ✅ Documente quais variáveis são necessárias (`.env.example`)
- ✅ Use diferentes variáveis para dev/staging/prod
- ✅ Rotacione credenciais regularmente
- ✅ Use Secret Manager para credenciais sensíveis
- ✅ Valide variáveis no startup da app

### ❌ DON'Ts

- ❌ Commitar `.env` ou arquivos com secrets
- ❌ Usar secrets em URLs ou logs
- ❌ Compartilhar credenciais via email/Slack
- ❌ Usar mesmas credenciais em dev/prod
- ❌ Expor Firebase Admin SDK credentials
- ❌ Logar valores de variáveis de ambiente

---

## Validação de Variáveis

```typescript
// ✅ Validar que variáveis existem
function getEnvVar(name: string): string {
  const value = process.env[name];
  
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  
  return value;
}

// Usar
const apiKey = getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY');
```

---

## Recursos Adicionais

- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Vercel: Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Firebase: Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [GitHub: Managing Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)

---

## Summary

| Arquivo | Git | Conteúdo |
|---------|-----|----------|
| `.env.example` | ✅ Sim | Template sem valores reais |
| `.env.local` | ❌ Não | Seus valores reais |
| `.env.development` | ✅ Sim | Defaults para desenvolvimento |
| `.env.production` | ✅ Sim | Defaults para produção |
| Vercel Dashboard | N/A | Variáveis de produção |

**Regra de Ouro:** Se você não quer que apareça no GitHub, não commita!

---

**Última atualização:** 22 de Fevereiro de 2026
