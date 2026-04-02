# Firestore Security Rules

## Configuração Necessária

Para que o aplicativo funcione corretamente com salvamento e leitura de dados, é necessário configurar as regras de segurança do Firestore no console do Firebase.

### 1. Acessar o Console Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione seu projeto `shadow-finance-app`
3. Vá para **Firestore Database** (lado esquerdo)
4. Clique em **Rules** (aba no topo)

### 2. Substituir as Regras

Remova todas as regras existentes e copie-cole o código abaixo:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Permite acesso apenas a usuários autenticados
    match /users/{userId} {
      // Usuário só pode acessar seus próprios dados
      allow read, write: if request.auth.uid == userId;
      
      // Sub-collections usadas pelo app
      match /finance/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }

      match /billing/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }

      // Estrutura legada (compatibilidade)
      match /subscriptions/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Bloqueia tudo mais
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. Publicar as Regras

1. Clique no botão **Publish** (canto superior direito)
2. Confirme a mensagem de aviso
3. Aguarde a confirmação (deve aparecer "Rules updated successfully")

---

## Estrutura de Dados Esperada

O aplicativo cria a seguinte estrutura no Firestore:

```
users/
  {userId}/
    finance/
      Jan: { faturamento: 17769, anuncios: 0, funcionarios: 802, faturamentoTotal: 17769, updatedAt: ... }
      Fev: { faturamento: ..., ... }
      Mar: { ... }
      ... (um documento por mês)
```

---

## Troubleshooting

### "Falha ao salvar no Firestore" ou "Sem permissão"

**Causa**: As regras de segurança estão muito restritivas.

**Solução**: 
- Verifique se as regras foram publicadas corretamente
- Verifique se o `userId` no código corresponde ao `uid` retornado por `auth.currentUser.uid`
- Tente fazer logout e login novamente

### "Timeout ao salvar"

**Causa**: Conexão lenta ou Firestore não respondendo.

**Solução**:
- Verifique sua conexão de internet
- Verifique se o Firebase está funcionando (status.firebase.google.com)
- Tente novamente em alguns minutos

### Dados não aparecem após recarregar a página

**Causa**: Dados não foram salvos no Firestore ou regra está bloqueando leitura.

**Solução**:
- Verifique o console (F12 > Console) para ver mensagens de erro
- Tente salvar novamente
- Verifique se as regras permitem leitura

---

## Teste Rápido

Para testar se tudo está funcionando:

1. Faça login no aplicativo
2. Mude o valor do mês selecionado
3. Clique "Salvar mês"
4. Você deve ver "✓ Dados salvos com sucesso."
5. Recarregue a página (F5)
6. Os dados devem voltar para o que você salvou

Se não funcionar, verifique os erros no console (F12 > Console ou Network).
