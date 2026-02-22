/**
 * Firebase Configuration
 * 
 * Este arquivo configura a conexão com o Firebase.
 * Ele inicializa:
 * - Firebase App
 * - Firebase Authentication (para login/registro)
 * - Firestore Database (para armazenar dados do usuário)
 * 
 * ⚠️ IMPORTANTE: As credenciais abaixo estão em um repositório público.
 * Em produção, use variáveis de ambiente para proteger dados sensíveis.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Configuração do Firebase obtida do Firebase Console
 * Projeto: shadow-corp-finances-app
 * 
 * Essas chaves garantem a conexão com o projeto Firebase correto
 */
const firebaseConfig = {
  apiKey: 'AIzaSyDlXt_TkfwJLMO_i4_aN5DWWKktJqP6pRQ',
  authDomain: 'shadow-corp-finances-app.firebaseapp.com',
  projectId: 'shadow-corp-finances-app',
  storageBucket: 'shadow-corp-finances-app.firebasestorage.app',
  messagingSenderId: '158666765776',
  appId: '1:158666765776:web:cbee81ee24f5672f7335d5',
};

/**
 * Inicializa o Firebase com as credenciais configuradas
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
