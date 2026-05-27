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

    // ── Dados do dono do workspace ───────────────────────────────────────────
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      match /finance/{document=**}       { allow read, write: if request.auth.uid == userId; }
      match /billing/{document=**}       { allow read, write: if request.auth.uid == userId; }
      match /subscriptions/{document=**} { allow read, write: if request.auth.uid == userId; }
      match /models/{document=**}        { allow read, write: if request.auth.uid == userId; }
      match /accounts/{document=**}      { allow read, write: if request.auth.uid == userId; }
      match /team/{document=**}          { allow read, write: if request.auth.uid == userId; }
      match /todos/{document=**}         { allow read, write: if request.auth.uid == userId; }
      match /content/{document=**}       { allow read, write: if request.auth.uid == userId; }
      match /devices/{document=**}       { allow read, write: if request.auth.uid == userId; }
    }

    // ── Sistema multi-usuário ────────────────────────────────────────────────

    // Workspace gerenciado pelo dono — membros podem ler seus próprios dados
    match /workspaces/{ownerId} {
      match /members/{memberId} {
        allow read:  if request.auth.uid == ownerId || request.auth.uid == memberId;
        allow write: if request.auth.uid == ownerId;
      }
      match /invites/{inviteId} {
        allow read, write: if request.auth.uid == ownerId;
      }
    }

    // Acesso dos membros aos dados do workspace do dono
    match /users/{ownerId}/{collection}/{document=**} {
      allow read, write: if
        request.auth != null &&
        exists(/databases/$(database)/documents/workspaces/$(ownerId)/members/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/workspaces/$(ownerId)/members/$(request.auth.uid)).data.status == 'active';
    }

    // Lookup de membership de um usuário
    match /userMemberships/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Índice global de códigos de convite
    match /inviteCodes/{code} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null;
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

## Estrutura de Dados

```
users/
  {ownerUid}/
    finance/         → Módulo Financeiro
    billing/         → Assinaturas mensais
    subscriptions/   → legado (compatibilidade)
    models/          → Perfis das modelos
    accounts/        → Contas de redes sociais
    team/            → Membros da equipe e VAs
    todos/           → Tarefas
    content/         → Sprints e planos de conteúdo
    devices/         → iPhones e dispositivos

workspaces/
  {ownerUid}/
    members/
      {memberUid}/   → { uid, email, displayName, role, permissions[], status }
    invites/
      {inviteId}/    → { code, role, permissions[], maxUses, uses }

userMemberships/
  {memberUid}/       → { workspaceId (= ownerUid), role, joinedAt }

inviteCodes/
  {code}/            → { workspaceId, inviteId }   ← índice para lookup rápido
```

---

## Sistema de Convites

### Como funciona:

1. **Dono** vai em ⚙️ Configurações → cria um convite com cargo e permissões
2. **Sistema** gera um código de 8 letras (ex: `AB12CD34`) e um link completo
3. **Dono** copia o link e envia para o membro
4. **Membro** acessa o link → vai direto para o cadastro com o código preenchido
5. **Membro** cria sua conta → registrado automaticamente no workspace
6. **Membro** faz login → vê apenas as abas que tem permissão

### Roles disponíveis:

| Cargo           | Permissões principais                        |
|-----------------|----------------------------------------------|
| 👑 Dono         | Tudo + gerencia workspace e configurações    |
| 🏆 Gerente      | Tudo exceto editar financeiro               |
| 📋 Account Mgr  | Overview, modelos, contas, tarefas, financeiro (leitura) |
| 💬 Chatter      | Overview, contas (editar), tarefas           |
| 🤝 VA           | Overview, contas (leitura), tarefas          |
| 🎬 Content Mgr  | Overview, modelos, conteúdo, tarefas         |

---

## Troubleshooting

### "Missing or insufficient permissions"

**Causa**: As regras de segurança estão desatualizadas ou não foram publicadas.

**Solução**: Copie as regras acima e publique no Firebase Console → Firestore → Rules.

### Membro não consegue acessar dados

**Causa**: A regra verifica `status == 'active'` no documento do membro.

**Solução**: Verifique se o membro não está com `status: revoked` em Configurações.

### Código de convite inválido no cadastro

**Causa**: O código não existe na coleção `inviteCodes` ou já foi expirado.

**Solução**: Peça ao dono para criar um novo convite em Configurações.
