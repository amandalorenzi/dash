'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseClientApp } from '@/lib/firebase/client';

export const DEFAULT_MAX_UPLOAD_MB = 2;

/** Sobe um arquivo para o Firebase Storage e retorna a URL pública de download. */
export async function uploadFile(path: string, file: File): Promise<{ url: string; storagePath: string }> {
  const storage = getStorage(getFirebaseClientApp());
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
  const url = await getDownloadURL(fileRef);
  return { url, storagePath: path };
}

/** Gera um path único e seguro para um upload (sem espaços/acentos no nome do arquivo). */
export function buildUploadPath(...segments: (string | undefined)[]): string {
  const safeName = (segments[segments.length - 1] ?? 'arquivo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const uid = Math.random().toString(36).slice(2, 9);
  const rest = segments.slice(0, -1).filter(Boolean).join('/');
  return `${rest}/${uid}-${safeName}`;
}

export function fileSizeMb(file: File): number {
  return file.size / (1024 * 1024);
}
