# Arquitetura do Finance Shadow App 🏗️

## Visão Geral

O Finance Shadow App é construído usando uma arquitetura de **three-tier** com separação clara entre camadas de apresentação, lógica e persistência.

```
┌─────────────────────────────────────────┐
│         Camada de Apresentação          │
│  (React Native / Expo Components)       │
├─────────────────────────────────────────┤
│         Camada de Lógica Negócio        │
│  (Hooks, Utilitários, Formatação)       │
├─────────────────────────────────────────┤
│         Camada de Persistência          │
│  (Firebase Auth + Firestore)            │
└─────────────────────────────────────────┘
```

## Fluxo de Dados

### 1. Autenticação (App.tsx)

```
Usuario acessa app
        ↓
Verifica autenticação (onAuthStateChanged)
        ↓
[Não autenticado]        [Autenticado]
    LoginScreen    →      DashboardScreen
    RegisterScreen        (com userId)
```

**Arquivo:** [App.tsx](App.tsx)

### 2. Dashboard Flow

```
DashboardScreen monta
        ↓
carrega dados do Firestore
        ↓
setMonthlyData (estado local)
        ↓
Usuário edita valores
        ↓
Valida dados
        ↓
Salva em Firestore
        ↓
Sucesso/Erro message
```

**Arquivo:** [src/screens/DashboardScreen.tsx](src/screens/DashboardScreen.tsx)

## Estrutura de Pastas

```
src/
├── firebase/
│   └── config.ts              ← Inicialização do Firebase
│                                - Autenticação
│                                - Firestore Database
│
├── screens/
│   ├── LoginScreen.tsx        ← Tela de login com email/senha
│   ├── RegisterScreen.tsx     ← Tela de registro de novo usuário
│   └── DashboardScreen.tsx    ← Painel principal (gráficos + formulário)
│
└── components/
    └── LineChart.tsx          ← Componente de gráfico de linha (reutilizável)
```

## Componentes Principais

### App.tsx
- **Responsabilidade:** Gerenciamento de router/navegação
- **Tarefas:**
  - Verificar estado de autenticação
  - Renderizar tela apropriada baseado no estado
  - Mostrar loading enquanto verifica autenticação
- **Estados principais:**
  - `user` - Usuário autenticado
  - `initializing` - Carregando autenticação
  - `authScreen` - Tela de auth (login/registro)

### DashboardScreen.tsx
- **Responsabilidade:** Painel de finanças
- **Tarefas:**
  - Exibir dados mensais em gráfico
  - Permitir edição de dados
  - Sincronizar com Firestore
  - Responsividade para diferentes telas
- **Estados principais:**
  - `monthlyData` - Dados de 12 meses
  - `selectedMonth` - Mês selecionado para edição
  - `saving` - Status de upload
  - `loadingData` - Status de download

### LineChart.tsx
- **Responsabilidade:** Gráfico visual de dados
- **Exibe:** Tendências mensais
- **Props:** `data`, `label`, `color`

## Estrutura de Dados (Firestore)

### Autenticação (Firebase Auth)
```
Usuário
├── uid: string
├── email: string
├── password: hash (gerenciado pelo Firebase)
└── criado: timestamp
```

### Database (Firestore)
```
users/{uid}/
├── email: string
├── createdAt: timestamp
│
└── finance/{month}/
    ├── month: string          (ex: "Jan")
    ├── faturamento: number
    ├── anuncios: number
    ├── funcionarios: number
    ├── faturamentoTotal: number
    └── updatedAt: timestamp
```

**Exemplo de documento:**
```json
{
  "month": "Janeiro",
  "faturamento": 120000,
  "anuncios": 35000,
  "funcionarios": 18000,
  "faturamentoTotal": 132000,
  "updatedAt": 1708608000000
}
```

## Fluxos de Casos de Uso

### 1. Novo Usuário se Registra

```
RegisterScreen
  ├─ Valida email e senha
  ├─ Chama createUserWithEmailAndPassword()
  ├─ Define fieldValue no Firestore/users/{uid}
  └─ Redireciona para LoginScreen
```

### 2. Usuário Faz Login

```
LoginScreen
  ├─ Coleta email/senha
  ├─ Chama signInWithEmailAndPassword()
  ├─ Firebase atualiza `auth` state
  ├─ App.tsx detecta mudança via onAuthStateChanged()
  └─ Renderiza DashboardScreen com userId
```

### 3. Visualizar e Editar Dados Financeiros

```
DashboardScreen carrega
  ├─ useEffect: getDocs(finance/{month})
  ├─ Combina dados salvos com dados padrão
  ├─ Usuário seleciona mês e edita valores
  ├─ Calcula faturamentoTotal automaticamente
  ├─ Clica "Salvar"
  ├─ Valida dados (required, números positivos)
  ├─ setDoc() salva em Firestore
  ├─ Exibe mensagem de sucesso
  └─ Recarrega dados (opcional)
```

### 4. Logout

```
DashboardScreen
  ├─ Usuário clica "Sair"
  ├─ signOut(auth)
  ├─ Firebase limpa auth state
  ├─ App.tsx detecta user === null
  └─ Renderiza LoginScreen
```

## Responsividade

O app detecta tamanho de tela e ajusta layout:

| Tamanho | Breakpoint | Layout |
|---------|-----------|--------|
| Mobile | < 720px | 1 coluna |
| Tablet | 720px - 1100px | 2 colunas |
| Desktop | > 1100px | 3 colunas |

**Implementação:** [DashboardScreen.tsx](src/screens/DashboardScreen.tsx#L70-L85)

```typescript
const columns = width >= 1100 ? 3 : width >= 720 ? 2 : 1;
```

## Padrões Utilizados

### 1. **Composition Pattern**
Componentes pequenos e reutilizáveis (LineChart) compostos em componentes maiores.

### 2. **Hooks Pattern**
Uso extensivo de React Hooks para gerenciar estado:
- `useState` - Estado local
- `useEffect` - Efeitos colaterais
- `useMemo` - Otimização
- `useRef` - Referências

### 3. **Controlled Components**
Para inputs de texto:
```typescript
<TextInput
  value={value}
  onChangeText={(text) => updateValue(text)}
/>
```

### 4. **Error Handling**
Try-catch para operações async:
```typescript
try {
  await saveData()
  setSaveMessage('Salvo com sucesso!')
} catch (err) {
  setSaveMessage('Erro ao salvar')
}
```

### 5. **Loading States**
Indicadores visuais durante operações:
```typescript
{saving && <ActivityIndicator />}
```

## Performance

### Otimizações Implementadas

1. **useMemo** - Memoização de valores computados (gráficos)
2. **Animations** - Uso de React Native Animated para evitar re-renders
3. **Cleanup** - Desincrição de listeners em useEffect
4. **Lazy Loading** - Dados carregados sob demanda

### Possíveis Melhorias

- [ ] Implementar pagination para grandes datasets
- [ ] Cache local com AsyncStorage
- [ ] Service Workers para offline support
- [ ] Code splitting por rota
- [ ] Imagens otimizadas

## Segurança

### Implementado

- ✅ Autenticação via Firebase (senhas hasheadas)
- ✅ Firestore Security Rules (usuários veem apenas seus dados)
- ✅ HTTPS (Firebase fornece SSL/TLS)
- ✅ Session management automático

### Recomendações Adicionais

- [ ] Adicionar 2FA (autenticação de dois fatores)
- [ ] Rate limiting em operações críticas
- [ ] Audit logs para acesso de dados
- [ ] Encriptação de dados sensíveis no Firestore

## Deployment

### Web (Vercel/Netlify)
```bash
npm run build
# Deploy os arquivos em dist/
```

### Mobile (App Store/Google Play)
```bash
eas build --platform android
eas build --platform ios
```

## Contribuição

Ao adicionar novas funcionalidades:

1. Mantenha a separação de responsabilidades
2. Adicione comentários em código complexo
3. Siga o padrão de nomenclatura TypeScript
4. Teste em múltiplas resoluções de tela
5. Atualize esta documentação

---

**Última atualização:** 22 de Fevereiro de 2026
