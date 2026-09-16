'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { Drawer, ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { CredentialsModal, type TempCredentials } from '@/components/ui/CredentialsModal';
import { ROLE_LABEL } from '@/config/labels';
import { fmtDateShort } from '@/utils/format';
import { createUserAction, updateUserRoleAction, resetUserPasswordAction, deleteUserAction, updateUserAvatarAction } from '@/modules/users/actions';
import { Avatar } from '@/components/ui/Avatar';
import type { UserProfile, Role } from '@/types/domain';

const ASSIGNABLE_ROLES: Role[] = ['SUPER_ADMIN', 'PRODUCAO', 'FINANCEIRO', 'OPERACIONAL'];

export function UsuariosClient({ users, currentUid }: { users: UserProfile[]; currentUid: string }) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<TempCredentials | null>(null);
  const [removing, setRemoving] = useState<UserProfile | null>(null);
  const [editingAvatar, setEditingAvatar] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  const team = users.filter((u) => u.role !== 'EXPOSITOR');
  const exhibitors = users.filter((u) => u.role === 'EXPOSITOR');

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setFormError(null);
    const fd = new FormData(e.currentTarget);
    const result = await createUserAction({ name: fd.get('name'), email: fd.get('email'), role: fd.get('role'), avatarUrl: fd.get('avatarUrl') });
    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }
    toast('Usuário criado.', 'success');
    setDrawerOpen(false);
    if (result.credentials) setCredentials(result.credentials);
    router.refresh();
  }

  async function handleRoleChange(uid: string, role: Role) {
    const result = await updateUserRoleAction(uid, role);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Papel atualizado.', 'success');
    router.refresh();
  }

  async function handleResetPassword(u: UserProfile) {
    const result = await resetUserPasswordAction(u.uid);
    if (!result.ok) { toast(result.error, 'error'); return; }
    if (result.credentials) setCredentials(result.credentials);
    toast('Nova senha temporária gerada.', 'success');
    router.refresh();
  }

  async function handleSaveAvatar() {
    if (!editingAvatar) return;
    const result = await updateUserAvatarAction(editingAvatar.uid, avatarUrl);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Foto atualizada.', 'success');
    setEditingAvatar(null);
    router.refresh();
  }

  async function handleRemove() {
    if (!removing) return;
    const result = await deleteUserAction(removing.uid);
    setRemoving(null);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Usuário removido.', 'success');
    router.refresh();
  }

  return (
    <>
      <ToastHost />
      <div className="page-header">
        <div>
          <h1>Usuários e permissões</h1>
          <p>Equipe da DASH com acesso ao painel administrativo. Acessos de expositor são gerenciados na tela de Expositores.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setFormError(null); setDrawerOpen(true); }}>+ Novo usuário</button>
        </div>
      </div>

      <div className="table-wrap mb-16">
        <div className="table-toolbar"><h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Equipe DASH</h3></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Senha</th><th>Criado em</th><th></th></tr></thead>
            <tbody>
              {team.length === 0 && <tr><td colSpan={6}><EmptyState icon="👤" title="Nenhum usuário" text="Crie o primeiro usuário da equipe." /></td></tr>}
              {team.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <div className="flex items-center gap-8">
                      <button className="btn-avatar-edit" title="Editar foto" onClick={() => { setEditingAvatar(u); setAvatarUrl(u.avatarUrl ?? ''); }}>
                        <Avatar name={u.name} url={u.avatarUrl} size={28} />
                      </button>
                      <div>
                        <div className="table-name">{u.name}</div>
                        {u.uid === currentUid && <div className="table-sub">você</div>}
                      </div>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="filter-select" style={{ minWidth: 170 }}
                      defaultValue={u.role}
                      disabled={u.uid === currentUid}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as Role)}
                    >
                      {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td>{u.mustChangePassword ? <Badge label="Troca pendente" tone="warning" /> : <Badge label="Definida" tone="success" />}</td>
                  <td>{fmtDateShort(u.createdAt)}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleResetPassword(u)}>Gerar nova senha</button>
                    {u.uid !== currentUid && <button className="btn btn-ghost btn-sm" onClick={() => setRemoving(u)}>Remover</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar"><h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Acessos de expositor</h3></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Senha</th><th>Criado em</th></tr></thead>
            <tbody>
              {exhibitors.length === 0 && <tr><td colSpan={4}><EmptyState icon="🏷" title="Nenhum acesso de expositor" text="Crie acessos pela tela de Expositores." /></td></tr>}
              {exhibitors.map((u) => (
                <tr key={u.uid}>
                  <td className="table-name">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.mustChangePassword ? <Badge label="Troca pendente" tone="warning" /> : <Badge label="Definida" tone="success" />}</td>
                  <td>{fmtDateShort(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={drawerOpen} title="Novo usuário da equipe" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="user-form" className="btn btn-primary" disabled={saving}>{saving ? 'Criando...' : 'Criar usuário'}</button></>}
      >
        <form id="user-form" className="flex-col gap-16" onSubmit={handleCreate}>
          {formError && <div className="login-error show">{formError}</div>}
          <div className="field"><label>Nome <span className="req">*</span></label><input required name="name" /></div>
          <div className="field"><label>E-mail <span className="req">*</span></label><input required type="email" name="email" /></div>
          <div className="field">
            <label>Papel <span className="req">*</span></label>
            <select name="role" required defaultValue="PRODUCAO">
              {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Foto de perfil (opcional)</label>
            <input type="url" name="avatarUrl" placeholder="https://..." />
          </div>
          <p className="text-sm text-muted">
            Uma senha temporária forte será gerada e mostrada uma única vez. O usuário terá que trocá-la no primeiro acesso.
          </p>
        </form>
      </Drawer>

      <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />

      <Drawer
        open={Boolean(editingAvatar)} title={`Foto de perfil · ${editingAvatar?.name ?? ''}`} onClose={() => setEditingAvatar(null)}
        footer={<><button className="btn btn-secondary" onClick={() => setEditingAvatar(null)}>Cancelar</button><button className="btn btn-primary" onClick={handleSaveAvatar}>Salvar</button></>}
      >
        <div className="flex-col gap-16">
          <div className="flex items-center gap-16">
            <Avatar name={editingAvatar?.name ?? ''} url={avatarUrl} size={56} />
            <div className="field" style={{ flex: 1 }}>
              <label>Link da imagem</label>
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://... (deixe em branco para remover)" />
            </div>
          </div>
        </div>
      </Drawer>

      <ConfirmModal
        open={Boolean(removing)} title="Remover usuário"
        message={`"${removing?.name}" perderá o acesso ao sistema imediatamente.`}
        confirmLabel="Remover" danger
        onCancel={() => setRemoving(null)} onConfirm={handleRemove}
      />
    </>
  );
}
