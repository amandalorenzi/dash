'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Drawer, ConfirmModal } from '@/components/ui/Drawer';
import { CredentialsModal, type TempCredentials } from '@/components/ui/CredentialsModal';
import { fmtDateShort } from '@/utils/format';
import { addSupplierUserAction, removeSupplierUserAction } from '@/modules/suppliers/actions';
import { resetUserPasswordAction } from '@/modules/users/actions';
import type { UserProfile } from '@/types/domain';

export function SupplierUsersPanel({ supplierId, users, toast }: {
  supplierId: string; users: UserProfile[]; toast: (m: string, t?: 'success' | 'error') => void;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<TempCredentials | null>(null);
  const [removing, setRemoving] = useState<UserProfile | null>(null);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setFormError(null);
    const fd = new FormData(e.currentTarget);
    const result = await addSupplierUserAction(supplierId, { name: fd.get('name'), email: fd.get('email') });
    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }
    toast('Usuário adicionado.', 'success');
    setDrawerOpen(false);
    if (result.credentials) setCredentials(result.credentials);
    router.refresh();
  }

  async function handleResetPassword(u: UserProfile) {
    const result = await resetUserPasswordAction(u.uid);
    if (!result.ok) { toast(result.error, 'error'); return; }
    if (result.credentials) setCredentials(result.credentials);
    toast('Nova senha temporária gerada.', 'success');
    router.refresh();
  }

  async function handleRemove() {
    if (!removing) return;
    const result = await removeSupplierUserAction(removing.uid, supplierId);
    setRemoving(null);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Usuário removido.', 'success');
    router.refresh();
  }

  return (
    <div className="card mt-16">
      <div className="card-header">
        <h3>Usuários com acesso ao portal</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => { setFormError(null); setDrawerOpen(true); }}>+ Adicionar usuário</button>
      </div>
      <div className="card-body">
        {users.length === 0 ? (
          <EmptyState icon="👤" title="Nenhum acesso criado" text="Adicione o primeiro usuário para este expositor acessar o portal." />
        ) : (
          <div className="table-wrap" style={{ boxShadow: 'none' }}>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Usuário</th><th>E-mail</th><th>Senha</th><th>Criado em</th><th></th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid}>
                      <td>
                        <div className="flex items-center gap-8">
                          <Avatar name={u.name} url={u.avatarUrl} size={26} />
                          <span className="table-name">{u.name}</span>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.mustChangePassword ? <Badge label="Troca pendente" tone="warning" /> : <Badge label="Definida" tone="success" />}</td>
                      <td>{fmtDateShort(u.createdAt)}</td>
                      <td className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleResetPassword(u)}>Gerar nova senha</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setRemoving(u)}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="text-sm text-muted mt-16">
          Todas as pessoas listadas acima veem os mesmos dados deste expositor (cadastro, extras, discussão) — o acesso
          é por empresa, não individual. A senha é mostrada uma única vez, logo após ser gerada.
        </p>
      </div>

      <Drawer
        open={drawerOpen} title="Adicionar usuário" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="add-supplier-user-form" className="btn btn-primary" disabled={saving}>{saving ? 'Criando...' : 'Criar acesso'}</button></>}
      >
        <form id="add-supplier-user-form" className="flex-col gap-16" onSubmit={handleAdd}>
          {formError && <div className="login-error show">{formError}</div>}
          <div className="field"><label>Nome <span className="req">*</span></label><input required name="name" /></div>
          <div className="field"><label>E-mail <span className="req">*</span></label><input required type="email" name="email" /></div>
        </form>
      </Drawer>

      <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />

      <ConfirmModal
        open={Boolean(removing)} title="Remover acesso"
        message={`"${removing?.name}" perde o acesso ao portal imediatamente. Os demais usuários deste expositor continuam com acesso normal.`}
        confirmLabel="Remover" danger
        onCancel={() => setRemoving(null)} onConfirm={handleRemove}
      />
    </div>
  );
}
