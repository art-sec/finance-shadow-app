# Como Configurar Firestore Rules - Guia Passo-a-Passo

## ⚠️ IMPORTANTE: Seu aplicativo não vai salvar dados SEM estas regras!

Se não configurar, você verá o erro:
- "Sem permissão para salvar"
- "Você foi desconectado"
- Dados não aparecem após recarregar

---

## 📱 Passo 1: Abrir o Console Firebase

1. **Abra esta URL no seu navegador:**
   ```
   https://console.firebase.google.com
   ```

2. **Veja a lista de projetos**
3. **Clique em `shadow-finance-app`** (seu projeto)

---

## 🗄️ Passo 2: Ir até Firestore

1. **No painel esquerdo**, procure por **"Firestore Database"**
2. **Clique nele**
3. Você verá uma página com suas coleções (ou vazia)

---

## 🔐 Passo 3: Abrir as Regras

1. **No topo**, vê 3 abas: "Data", "Indexes", **"Rules"**
2. **Clique na aba "Rules"**
3. Você verá um editor de texto com o código das regras

---

## 📝 Passo 4: Copiar o Código das Regras

### **LIMPE TUDO QUE ESTÁ LÁ** e coloque isto:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Permite acesso apenas a usuários autenticados
    match /users/{userId} {
      // Usuário só pode acessar seus próprios dados
      allow read, write: if request.auth.uid == userId;
      
      // Dados financeiros do usuário
      match /finance/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }

      // Dados de faturamento/gastos diários e assinaturas mensais
      match /billing/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }

      // Estrutura legada de assinaturas (compatibilidade)
      match /subscriptions/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Bloqueia qualquer outro acesso
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ✅ Passo 5: Publicar as Regras

1. **Clique no botão azul "Publish"** (canto superior direito)
2. **Um popup vai aparecer** perguntando se tem certeza
3. **Clique em "Publish"** novamente
4. **Aguarde** até aparecer: ✓ "Rules updated successfully"

---

## 🧪 Passo 6: Testar

Agora volta no seu app:

1. **Abra** http://localhost:19006
2. **Faça login** (ou crie conta)
3. **Mude um valor**, ex: Faturamento
4. **Clique "Salvar mês"**
5. Deve aparecer: ✓ **"Dados salvos com sucesso."**
6. **Recarregue a página** (F5)
7. **O valor deve estar lá!** ✨

---

## ❌ Se o botão ficar infinito (travado)...

1. **Abra o Console** (pressione F12)
2. **Vá para a aba "Console"**
3. **Procure por mensagens de erro em vermelho**
4. **Copie o erro** e me mostre

---

## 🆘 Principais Erros e Soluções

### "Sem permissão para salvar"
- **Problema**: Regras muito restritivas
- **Solução**: Copie o código exato acima, sem mudanças

### "Você foi desconectado"
- **Problema**: Sessão expirou
- **Solução**: Faça logout/login novamente no app

### "Conexão lenta ou indisponível"
- **Problema**: Firestore não respondendo
- **Solução**: Aguarde ou tente em alguns minutos

### Dados não aparecem após recarregar
- **Problema**: Não foram salvos realmente
- **Solução**: Verifique se as regras foram publicadas (deve estar verde ✓)

---

## 📹 Resumo em 30 segundos

1. firebase.google.com → Seu projeto
2. Firestore → Aba "Rules"
3. Cole o código acima
4. "Publish" → Confirma

**Pronto!** Seu app já vai salvar dados. 🎉

---

## ❓ Dúvidas?

Se algo não funcionar:
1. Verifique se as regras estão em **VERDE** (publicadas)
2. Abra o Console (F12) e procure por erros vermelhos
3. Faça logout/login novamente

Me mostre qualquer erro que aparecer no console!
