import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK — só roda no servidor (Server Components, Server
 * Actions, Route Handlers). A inicialização é "lazy" (só acontece no
 * primeiro uso) para não quebrar o `next build`, que não tem acesso às
 * credenciais reais em tempo de build.
 *
 * NUNCA importe este arquivo em um componente marcado com 'use client'.
 */

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // A chave privada vem com \n escapados na variável de ambiente da Vercel.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Credenciais do Firebase Admin ausentes. Configure FIREBASE_PROJECT_ID, ' +
      'FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY (ver .env.example).',
    );
  }

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
