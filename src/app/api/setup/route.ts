import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { generateTempPassword } from '@/lib/passwords';
import type { UserProfile } from '@/types/domain';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * Bootstrap do primeiro administrador — feito pela interface, sem depender
 * de rodar script/seed local (o time faz deploy direto pela Vercel).
 *
 * Só funciona enquanto NÃO existir nenhum perfil cadastrado. Assim que o
 * primeiro SUPER_ADMIN é criado, esta rota passa a recusar qualquer
 * chamada — não há como usá-la para escalar privilégio depois.
 */
const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  email: z.string().email('E-mail inválido.'),
});

async function setupAlreadyDone(): Promise<boolean> {
  const snap = await adminDb().collection(COLLECTIONS.profiles).limit(1).get();
  return !snap.empty;
}

export async function GET() {
  try {
    return NextResponse.json({ available: !(await setupAlreadyDone()) });
  } catch {
    return NextResponse.json({ available: false, error: 'Não foi possível conectar ao Firebase. Confira as variáveis de ambiente.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (await setupAlreadyDone()) {
      return NextResponse.json({ error: 'A configuração inicial já foi concluída. Use a tela de Usuários para criar novos acessos.' }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
    }
    const { name, email } = parsed.data;
    const tempPassword = generateTempPassword();

    let uid: string;
    try {
      const created = await adminAuth().createUser({ email, password: tempPassword, displayName: name, emailVerified: true });
      uid = created.uid;
    } catch (err) {
      if ((err as { code?: string })?.code === 'auth/email-already-exists') {
        // Usuário já existe no Authentication (criado manualmente no console):
        // reaproveita o UID e só define a senha temporária e o perfil.
        const existing = await adminAuth().getUserByEmail(email);
        uid = existing.uid;
        await adminAuth().updateUser(uid, { password: tempPassword, displayName: name });
      } else {
        throw err;
      }
    }

    const profile: UserProfile = {
      uid, email, name, role: 'SUPER_ADMIN', supplierId: null, eventId: null,
      mustChangePassword: true, createdAt: new Date().toISOString(),
    };
    await adminDb().collection(COLLECTIONS.profiles).doc(uid).set(profile);

    return NextResponse.json({ ok: true, email, tempPassword });
  } catch (err) {
    console.error('Falha no setup inicial:', err);
    return NextResponse.json({ error: 'Falha ao criar o administrador. Confira as variáveis FIREBASE_* na Vercel.' }, { status: 500 });
  }
}
