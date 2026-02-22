# Guia de Deploy na Vercel 🚀

Guia completo para fazer deploy do Finance Shadow App na Vercel de forma rápida e segura.

## O que é Vercel?

**Vercel** é uma plataforma de hosting otimizada para aplicações web moderna. Oferece:
- ✅ Deploy automático via Git
- ✅ HTTPS por padrão
- ✅ CDN global
- ✅ Variáveis de ambiente seguras
- ✅ Preview automático de PRs
- ✅ Plano gratuito generoso

[Visite Vercel](https://vercel.com)

---

## Pré-requisitos

### 1. Conta Vercel
- Acesse [vercel.com](https://vercel.com)
- Clique "Sign Up"
- Escolha "Continue with GitHub" (mais fácil)
- Autorize a Vercel acessar seus repositórios

### 2. Repositório GitHub
- Seu projeto já está em https://github.com/art-sec/finance-shadow-app ✅

### 3. Node.js localmente (para testar build)
```bash
node --version  # v18 ou superior
npm --version   # v9 ou superior
```

---

## Passo 1: Preparar a Aplicação

### 1.1 Criar arquivo de configuração Vercel

Criar `vercel.json` na raiz do projeto:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "expo",
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

**O que faz:**
- `buildCommand` - Comando que constrói a aplicação
- `outputDirectory` - Pasta que será servida (gerada pelo build)
- `rewrites` - Redireciona URLs para index.html (importante para SPA)

### 1.2 Adicionar script de build no package.json

Se ainda não existir, adicione:

```json
{
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "build": "expo export --platform web",
    "deploy:vercel": "npm run build && vercel"
  }
}
```

Testar localmente:
```bash
npm run build
```

Isso deve criar uma pasta `dist/` com os arquivos otimizados.

### 1.3 Adicionar arquivo .gitignore (se não existir)

```
node_modules/
dist/
build/
.env.local
.env*.local
.vercel
.expo/
*.log
```

---

## Passo 2: Deploy via GitHub Integration

### Opção A: Deploy Automático (Recomendado)

**1. Acesse o Dashboard Vercel**

```
https://vercel.com/dashboard
```

**2. Clique em "Add New..."**

![step-1](https://imgur.com/1234567.png)

**3. Selecione "Project"**

**4. Clique em "Import"** (do GitHub)

**5. Procure pelo repositório**

```
finance-shadow-app
```

**6. Clique em "Import"**

**7. Configure o projeto:**

Na tela "Configure Project":

- **Project Name:** `finance-shadow-app` (ou outro nome)
- **Framework:** Selecione "Expo" (ou "Other" se não aparecer)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** `./` (padrão)

**8. Variáveis de Ambiente:**

Clique em "Environment Variables" e adicione:

```
EXPO_PUBLIC_API_URL = https://seu-api.com
```

(Se tiver variáveis confidenciais do Firebase)

**9. Clique em "Deploy"**

Vercel vai:
1. Clonar o repositório
2. Instalar dependências
3. Executar `npm run build`
4. Fazer upload dos arquivos
5. Atribuir um domínio

**10. Aguarde 2-3 minutos**

Quando ver "Visit", seu app está live! ✅

### Opção B: Deploy Manual (CLI)

Se preferir via command line:

**1. Instalar Vercel CLI**

```bash
npm i -g vercel
```

**2. Fazer Login**

```bash
vercel login
```

Abrirá navegador para autenticar.

**3. Fazer Deploy**

```bash
vercel
```

Responda as perguntas:

```
? Set up and deploy "C:\...\site-financas"? [Y/n] y
? Which scope should contain your project? [seu-username]
? Link to existing project? [y/N] N (primeira vez)
? What's your project's name? finance-shadow-app
? In which directory is your code located? ./
? Want to modify these settings? [y/N] N
? 🔨  Building your project...
```

Aguarde o build completar.

**4. URL gerada**

```
✅ https://finance-shadow-app.vercel.app
```

Copie essa URL!

---

## Passo 3: Configurar Variáveis de Ambiente

### Se usar variáveis sensíveis (como Firebase API keys)

**⚠️ IMPORTANTE:** Nunca commite `.env` com chaves reais no Git!

**1. Criar arquivo `.env.example`** (sem valores reais)

```
# .env.example
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

**2. Adicionar ao `.gitignore`**

```
.env
.env.local
.env.*.local
```

**3. No Dashboard Vercel**

- Vá para Project Settings
- Clique em "Environment Variables"
- Adicione cada variável:

```
EXPO_PUBLIC_FIREBASE_API_KEY = AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = shadow-corp...
...
```

**4. Atualizar `src/firebase/config.ts`**

```typescript
// Usar variáveis de ambiente
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const app = initializeApp(firebaseConfig);
```

⚠️ **Nota:** No Expo, variáveis públicas precisam de prefixo `EXPO_PUBLIC_`.

---

## Passo 4: Fazer Deploy de Atualizações

### Quando você faz mudanças no código:

**1. Commit e Push para main**

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

**2. Vercel detecta o push automaticamente**

- Vê a mudança no GitHub
- Executa build automaticamente
- Deploy novo em ~2-3 minutos
- URL permanece a mesma

**3. Verificar deploy**

Vá para Dashboard Vercel → Seu projeto → Deployments

Verá lista de todos os deploys com status.

---

## Passo 5: Configurações Avançadas

### Domínio Customizado

**1. Compre um domínio**

Pode ser em:
- [Vercel Domains](https://vercel.com/domains)
- [Namecheap](https://namecheap.com)
- [Google Domains](https://domains.google)

**2. Conectar a Vercel**

Se comprou via Vercel:
- Ir para Project Settings
- Clique em "Domains"
- Domain já estará conectado ✅

Se comprou em outro lugar:
- Ir para Project Settings → Domains
- Clique "Add Domain"
- Mude os nameservers no seu registrador para os da Vercel

**3. Espere até 48 horas** para propagação DNS

### Redirecionamentos

Se quiser redirecionar URLs, adicione em `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/antigo-caminho",
      "destination": "/novo-caminho",
      "permanent": true
    },
    {
      "source": "/docs",
      "destination": "https://documentacao.com",
      "permanent": false
    }
  ]
}
```

### Reescritas de URL

Se usar roteamento customizado:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://sua-api.com/:path*"
    }
  ]
}
```

### Headers Customizados

```json
{
  "headers": [
    {
      "source": "/",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

## Troubleshooting

### ❌ Build Falha

**Erro comum:** "Cannot find module"

```bash
# Localmente, execute:
npm install
npm run build

# Se não der erro localmente, é dependência faltando
# Checque: package.json tem todas as dependências?
```

**Solução:**

```bash
npm install react-native-web

# Depois commit
git add package-lock.json
git commit -m "fix: add missing dependencies"
git push
```

### ❌ Variáveis de Ambiente não funcionam

```
❌ Erro: "process.env.EXPO_PUBLIC_API_KEY is undefined"
```

**Checagem:**

1. Variável está no Dashboard Vercel?
2. Prefixo correto? (`EXPO_PUBLIC_` é obrigatório)
3. Fazer redeploy após adicionar variável:
   - Dashboard → Deployments
   - Clique nos 3 pontos
   - "Redeploy"

### ❌ Site mostra erro 404

**Causa comum:** SPA (Single Page App) precisa de rewrite

Certifique-se que `vercel.json` tem:

```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

### ❌ Muito lenta

1. Verifique Network tab (DevTools)
2. Imagens otimizadas?
3. Código dividido (code splitting)?
4. Usar Vercel Analytics para debug

---

## Monitorar Deploy

### Vercel Analytics

No Dashboard Vercel:
- **Deployments** - Histórico de deploys
- **Usage** - Requisições e dados
- **Analytics** - Performance do site
- **Logs** - Errors e warnings

### Web Vitals

Vercel mostra:
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)

Otimize seu site se números ruins.

---

## Checklist Pré-Deploy

- [ ] Local build funciona (`npm run build`)
- [ ] Git repository clean (sem arquivos não commitados)
- [ ] `.env` está no `.gitignore`
- [ ] Variáveis de ambiente estão no `.env.example`
- [ ] `vercel.json` configurado corretamente
- [ ] `package.json` tem script `build`
- [ ] Testem a build localmente: `npm run build && npm run web`

---

## Próximas Etapas

Após deploy:

1. **Teste a URL**
   ```
   https://seu-app.vercel.app
   ```

2. **Teste em Mobile**
   ```
   QR code na página de deployment
   ```

3. **Monitore Performance**
   ```
   Dashboard → Analytics
   ```

4. **Configure Domain**
   ```
   Se tiver domínio customizado
   ```

5. **Setup CI/CD**
   ```
   Vercel já faz isso automaticamente!
   ```

---

## Recursos Adicionais

- [Documentação Vercel](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/cli/docs)
- [Expo Web Docs](https://docs.expo.dev/guides/web/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## Suporte

Se tiver dúvidas:

1. **Vercel Docs** - https://vercel.com/docs
2. **GitHub Issues** - Abra issue no repositório
3. **Vercel Support** - https://vercel.com/support
4. **Discord Expo** - https://chat.expo.dev

---

**Parabéns! Seu app agora está online!** 🎉

Seu site está acessível em:
```
https://finance-shadow-app.vercel.app
```

A partir daqui:
- Qualquer `git push` para `main` fará deploy automático ✅
- Cada PR terá um preview URL automático ✅
- Você terá analytics de performance ✅

---

**Última atualização:** 22 de Fevereiro de 2026
