# Finance Shadow App 💰

Um aplicativo de painel financeiro moderno, responsivo e multi-plataforma construído com **React Native**, **Expo** e **Firebase**. Permite que os usuários rastreiem receitas, despesas e gérem seus dados financeiros através de uma interface intuitiva.

## 📋 Características Principais

- ✅ **Autenticação Segura** - Login e registro com Firebase Authentication
- ✅ **Painel Financeiro** - Visualização de resumo mensal de finanças
- ✅ **Gráficos Interativos** - Gráficos de linhas para análise visual de dados
- ✅ **Responsivo** - Funciona em Web, iOS e Android
- ✅ **Armazenamento em Nuvem** - Dados sincronizados com Firestore
- ✅ **Interface Moderna** - Design limpo e profissional

## 🚀 Requisitos do Sistema

- **Node.js** v18 ou superior
- **npm** v9 ou superior (ou yarn/pnpm)
- **Expo CLI** (instalado automaticamente via npm)
- Conta no **Firebase** (para configuração do banco de dados)

## 📦 Instalação

### 1. Clonar o Repositório

```bash
git clone https://github.com/art-sec/finance-shadow-app.git
cd finance-shadow-app
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Firebase

#### Pré-requisitos:
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto ou use um existente
3. Ative **Authentication** (Email/Password)
4. Crie um banco de dados **Firestore** em modo teste

#### Adicionar Credenciais:

Edite `src/firebase/config.ts` e adicione suas credenciais do Firebase:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Para obter essas credenciais:**
1. No Firebase Console, vá para Project Settings (⚙️)
2. Na aba "General", desça até a seção "Your apps"
3. Clique em seu app da web
4. Copie a configuração sob "firebaseConfig"

## 🏃 Como Executar

### Desenvolvimento Web

```bash
npm run web
```

Abre a aplicação no navegador padrão em `http://localhost:8081`

### Android

```bash
npm run android
```

Requer Android Studio ou emulador Android instalado.

### iOS

```bash
npm run ios
```

Requer macOS com Xcode instalado.

### Desenvolvimento (todos os plataformas)

```bash
npm start
```

Use as teclas para selecionar a plataforma:
- `w` para Web
- `a` para Android
- `i` para iOS

## 📂 Estrutura do Projeto

```
finance-shadow-app/
├── src/
│   ├── firebase/
│   │   └── config.ts                 # Configuração do Firebase
│   ├── screens/
│   │   ├── LoginScreen.tsx           # Tela de login
│   │   ├── RegisterScreen.tsx        # Tela de registro
│   │   └── DashboardScreen.tsx       # Painel principal
│   └── components/
│       └── LineChart.tsx              # Componente de gráfico
├── server/
│   ├── index.js                       # Servidor Express (utilidades)
│   └── package.json
├── App.tsx                            # Componente principal da aplicação
├── app.json                           # Configuração do Expo
├── tsconfig.json                      # Configuração do TypeScript
├── package.json                       # Dependências do projeto
└── README.md                          # Este arquivo
```

## 🔐 Segurança Firebase

### Regras do Firestore

Configure as seguintes regras de segurança no Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{document=**} {
      allow read, write: if request.auth.uid == document;
    }
  }
}
```

Isso garante que cada usuário possa acessar apenas seus próprios dados.

## 💾 Estrutura de Dados (Firestore)

```
users/
  {uid}/
    email: string
    profile: object
      name: string
      createdAt: timestamp
```

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia o servidor de desenvolvimento Expo |
| `npm run web` | Executa a aplicação em navegador Web |
| `npm run android` | Executa em emulador/dispositivo Android |
| `npm run ios` | Executa em emulador/dispositivo iOS |

## 🔧 Tecnologias Utilizadas

- **React Native** - Framework para aplicações multiplataforma
- **Expo** - Plataforma para desenvolvimento React Native
- **Firebase** - Backend e autenticação
- **TypeScript** - Tipagem estática para JavaScript
- **React Hooks** - Gerenciamento de estado moderno

## 📱 Responsividade

A aplicação detecta automaticamente o tamanho da tela e ajusta o layout:
- **Mobile** - Layout em coluna única (< 720px)
- **Tablet** - Layout em 2 colunas (720px - 1100px)
- **Desktop** - Layout em 3 colunas (> 1100px)

## 🚨 Troubleshooting

### Erro: "Firebase credentials not configured"
- Verifique se `src/firebase/config.ts` contém credenciais válidas

### Erro: "Cannot find module"
- Execute `npm install` novamente
- Delete a pasta `node_modules` e execute `npm install`

### Aplicação não carrega
- Limpe o cache do Expo: `expo r -c`
- Verifique se está usando a porta correta (padrão: 8081)

## 📝 Desenvolvimento

### Adicionar Nova Tela

1. Crie um novo arquivo em `src/screens/MyScreen.tsx`
2. Implemente como um componente React Native
3. Importe em `App.tsx` e configure a navegação

### Adicionar Novo Componente

1. Crie um arquivo em `src/components/MyComponent.tsx`
2. Exporte o componente como default
3. Importe onde for necessário

## 🤝 Contribuindo

Para contribuir com melhorias:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/melhoria`)
3. Commit suas mudanças (`git commit -m 'Adiciona melhoria'`)
4. Push para a branch (`git push origin feature/melhoria`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado. Para mais informações, entre em contato com o proprietário.

## 📧 Suporte

Para dúvidas ou problemas, abra uma issue no repositório GitHub.

---

**Última atualização:** 22 de Fevereiro de 2026
