import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDlXt_TkfwJLMO_i4_aN5DWWKktJqP6pRQ',
  authDomain: 'shadow-corp-finances-app.firebaseapp.com',
  projectId: 'shadow-corp-finances-app',
  storageBucket: 'shadow-corp-finances-app.firebasestorage.app',
  messagingSenderId: '158666765776',
  appId: '1:158666765776:web:cbee81ee24f5672f7335d5',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
