import { getCurrentUser } from '@/lib/auth/session';
import { listUsersAction } from '@/modules/users/actions';
import { AppShell } from '@/components/layout/AppShell';
import { UsuariosClient } from '@/components/admin/UsuariosClient';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const user = (await getCurrentUser())!;
  const users = await listUsersAction();
  return (
    <AppShell active="usuarios" user={user}>
      <UsuariosClient users={users} currentUid={user.uid} />
    </AppShell>
  );
}
