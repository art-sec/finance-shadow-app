/**
 * Firebase Configuration
 * 
 * Este arquivo configura a conexão com o Firebase.
 * Ele inicializa:
 * - Firebase App
 * - Firebase Authentication (para login/registro)
 * - Firestore Database (para armazenar dados do usuário)
 * 
 * As credenciais são carregadas de variáveis de ambiente.
 * Em desenvolvimento local, use .env.local
 * Em produção (Vercel), configure via Environment Variables no dashboard
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Configuração do Firebase obtida de variáveis de ambiente
 * Projeto: shadow-corp-finances-app
 * 
 * Variáveis com prefixo EXPO_PUBLIC_ são públicas e seguras de expor
 * (são para configuração do Firebase que é intencional ser pública)
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDlXt_TkfwJLMO_i4_aN5DWWKktJqP6pRQ',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'shadow-corp-finances-app.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'shadow-corp-finances-app',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'shadow-corp-finances-app.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '158666765776',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:158666765776:web:cbee81ee24f5672f7335d5',
};

/**
 * Inicializa o Firebase com as credenciais configuradas
 * Se variáveis de ambiente não estiverem definidas, usa valores fallback
 */
const app = initializeApp(firebaseConfig);

/**
 * Exportar instância de autenticação
 * Usado para login, registro e verificação de usuário
 * Exemplo: signInWithEmailAndPassword(auth, email, password)
 */
export const auth = getAuth(app);

/**
 * Exportar instância do Firestore Database
 * Usado para ler/escrever dados do usuário
 * Exemplo: doc(db, 'users', userId) para acessar documento do usuário
 */
export const db = getFirestore(app);
