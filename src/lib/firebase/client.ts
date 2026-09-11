'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Firebase Client SDK — usado apenas em componentes client (ex.: tela de
 * login, que precisa do signInWithEmailAndPassword no navegador). Toda
 * leitura/escrita de dados de negócio acontece no servidor via
 * firebase-admin (ver src/lib/firebase/admin.ts), nunca diretamente do
 * cliente — o navegador nunca deve conseguir ler/gravar Firestore
 * arbitrariamente manipulando IDs.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseClientApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuthClient() {
  return getAuth(getFirebaseClientApp());
}
