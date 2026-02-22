# Guia de Desenvolvimento 🛠️

Guia completo para desenvolver novas funcionalidades no Finance Shadow App.

## Ambiente de Desenvolvimento

### Requisitos
- Node.js v18+
- npm v9+
- Editor de código (VS Code recomendado)
- Git

### Setup Inicial

```bash
# 1. Clonar repositório
git clone https://github.com/art-sec/finance-shadow-app.git
cd finance-shadow-app

# 2. Instalar dependências
npm install

# 3. Configurar Firebase (veja README.md)
# Editar src/firebase/config.ts

# 4. Iniciar desenvolvimento
npm run web
```

## Estrutura de Desenvolvimento

### Branch Naming

```
feature/nome-da-feature    # Nova funcionalidade
fix/nome-do-bug           # Correção de bug
docs/nome-documentacao    # Documentação
refactor/nome-refactor    # Refatoração
```

### Commits

Usar mensagens descritivas:

```bash
git commit -m "feat: adiciona gráfico de pizza para despesas"
git commit -m "fix: corrige bug de sincronização no login"
git commit -m "docs: atualiza README com instruções Firebase"
```

### Pull Requests

1. Crie uma branch: `git checkout -b feature/sua-feature`
2. Faça commits pequenos e focados
3. Push: `git push origin feature/sua-feature`
4. Abra PR com descrição clara

---

## Adicionando Novas Funcionalidades

### 1. Adicionar Nova Tela

**Exemplo: Tela de Configurações**

1. Criar arquivo `src/screens/SettingsScreen.tsx`:

```typescript
/**
 * Settings Screen
 * 
 * Descrição do que faz
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  userId: string;
  onBack: () => void;
};

export default function SettingsScreen({ userId, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text>Configurações</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0B0D10',
  },
});
```

2. Importar em `App.tsx`:

```typescript
import SettingsScreen from './src/screens/SettingsScreen';

// Adicionar estado
const [appScreen, setAppScreen] = useState<'dashboard' | 'settings'>('dashboard');

// Adicionar condicional de renderização
{appScreen === 'settings' ? (
  <SettingsScreen 
    userId={user.uid}
    onBack={() => setAppScreen('dashboard')}
  />
) : (
  // ... dashboard
)}
```

### 2. Adicionar Novo Componente

**Exemplo: Botão Customizado**

Criar `src/components/CustomButton.tsx`:

```typescript
/**
 * Custom Button Component
 * 
 * Componente de botão reutilizável com styling consistente
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export default function CustomButton({ 
  title, 
  onPress, 
  variant = 'primary',
  disabled = false 
}: Props) {
  return (
    <Pressable
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E6D46A',
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#4EC5FF',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#0B0D10',
    fontWeight: '600',
  },
});
```

Usar o componente:

```typescript
<CustomButton 
  title="Salvar" 
  onPress={() => save()}
  variant="primary"
/>
```

### 3. Adicionar Funcionalidade Firestore

**Exemplo: Salvar Preferências do Usuário**

1. Criar função utilitária em `src/services/userService.ts`:

```typescript
/**
 * User Service
 * 
 * Funções para gerenciar dados do usuário no Firestore
 */

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'pt' | 'en';
  notifications: boolean;
}

/**
 * Salvar preferências do usuário
 * 
 * @param userId - ID do usuário
 * @param preferences - Preferências a salvar
 */
export async function saveUserPreferences(
  userId: string,
  preferences: UserPreferences
) {
  try {
    await setDoc(
      doc(db, 'users', userId, 'settings', 'preferences'),
      preferences
    );
  } catch (err) {
    throw new Error(`Erro ao salvar preferências: ${err.message}`);
  }
}

/**
 * Obter preferências do usuário
 * 
 * @param userId - ID do usuário
 * @returns Preferências salvas ou defaults
 */
export async function getUserPreferences(
  userId: string
): Promise<UserPreferences> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'preferences');
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      return snapshot.data() as UserPreferences;
    }
    
    // Retornar defaults se não existir
    return {
      theme: 'dark',
      language: 'pt',
      notifications: true,
    };
  } catch (err) {
    throw new Error(`Erro ao obter preferências: ${err.message}`);
  }
}
```

2. Usar em um componente:

```typescript
import { saveUserPreferences } from '../services/userService';

// No handler
const handleSavePreferences = async () => {
  try {
    await saveUserPreferences(userId, {
      theme: 'dark',
      language: 'pt',
      notifications: true,
    });
    setMessage('Preferências salvas!');
  } catch (err) {
    setError(err.message);
  }
};
```

### 4. Adicionar Validação de Dados

**Exemplo: Validador de Email**

Criar `src/utils/validation.ts`:

```typescript
/**
 * Validation Utilities
 * 
 * Funções para validar dados de entrada
 */

/**
 * Validar formato de email
 * 
 * @param email - Email a validar
 * @returns true se válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar força de senha
 * 
 * @param password - Senha a validar
 * @returns Nível de força (0-3)
 */
export function getPasswordStrength(password: string): number {
  if (password.length < 6) return 0;
  
  let strength = 1;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  return Math.min(strength, 3);
}

/**
 * Validar número positivo
 */
export function isPositiveNumber(value: any): boolean {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}
```

Usar em validação:

```typescript
import { isValidEmail } from '../utils/validation';

if (!isValidEmail(email)) {
  setError('Email inválido');
  return;
}
```

### 5. Adicionar Teste

Criar `__tests__/validation.test.ts`:

```typescript
/**
 * Testes para funções de validação
 */

import { isValidEmail, isPositiveNumber } from '../src/utils/validation';

describe('Validation', () => {
  describe('isValidEmail', () => {
    it('deve validar email válido', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('deve rejeitar email sem @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('deve rejeitar email vazio', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('deve validar números positivos', () => {
      expect(isPositiveNumber(100)).toBe(true);
    });

    it('deve rejeitar números negativos', () => {
      expect(isPositiveNumber(-50)).toBe(false);
    });
  });
});
```

---

## Padrões de Código

### Nomenclatura

```typescript
// ✅ Bom
const userData = getUserData();
const isLoading = true;
function calculateTotal() {}

// ❌ Evitar
const data = getUserData();
const loading = true;
function calcTotal() {}
```

### Comentários

```typescript
// ✅ Bom
/**
 * Calcula o total mensal de despesas
 * 
 * @param expenses - Array de despesas
 * @returns Total das despesas em centavos
 */
function calculateMonthlyTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

// ❌ Evitar
// função que calcula total
function calcTotal(arr) {
  return arr.reduce((a, b) => a + b.amount, 0);
}
```

### Estado

```typescript
// ✅ Bom - estados relacionados agrupados
const [formData, setFormData] = useState<FormData>({
  name: '',
  email: '',
  amount: 0,
});

// ❌ Evitar - múltiplos estados separados
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [amount, setAmount] = useState(0);
```

### Efeitos

```typescript
// ✅ Bom - cleanup e dependências claras
useEffect(() => {
  let mounted = true;

  const loadData = async () => {
    const data = await fetchData();
    if (mounted) {
      setData(data);
    }
  };

  loadData();

  return () => {
    mounted = false;
  };
}, [userId]); // Dependência clara

// ❌ Evitar - sem cleanup ou sem dependências
useEffect(() => {
  const data = await fetchData();
  setData(data);
});
```

---

## Performance

### Otimizações

```typescript
// ✅ Memoizar valores custosos
const chartData = useMemo(() => {
  return data.map(item => ({
    ...item,
    formatted: formatCurrency(item.value)
  }));
}, [data]);

// ✅ Usar Animated para transições
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
}, []);
```

### Debugging

```bash
# Inspecionar estado do Firebase
npm run web  # Abrir DevTools do navegador > Console

# Logs customizados
console.log('Estado atual:', state);
console.warn('Atenção:', message);
console.error('Erro:', error);
```

---

## Checklist para PR

- [ ] Código segue o padrão do projeto
- [ ] Testes passam (se houver)
- [ ] Sem console.log ou código comentado
- [ ] TypeScript compila sem erros
- [ ] Responsivo (testado em mobile/tablet/desktop)
- [ ] Comentários explicativos onde necessário
- [ ] README atualizado se houver mudanças públicas

---

## Recursos Úteis

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Firebase Docs](https://firebase.google.com/docs)
- [Expo Docs](https://docs.expo.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Última atualização:** 22 de Fevereiro de 2026
