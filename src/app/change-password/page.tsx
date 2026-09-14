'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import { clearMustChangePasswordAction } from '@/modules/users/password-actions';
import '@/styles/dash-ui.css';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não conferem.'); return; }

    setLoading(true);
    try {
      const auth = getFirebaseAuthClient();
      const currentUser = auth.currentUser;
      if (!currentUser) { setError('Sessão expirada. Faça login novamente.'); setLoading(false); return; }

      await updatePassword(currentUser, password);
      const result = await clearMustChangePasswordAction();
      if (!result.ok) { setError(result.error); setLoading(false); return; }

      router.push('/');
      router.refresh();
    } catch {
      setError('Não foi possível trocar a senha. Se fez login há muito tempo, saia e entre novamente com a senha temporária antes de tentar de novo.');
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-brand">
        <div>
          <div className="brand-mark">dash<span className="dot">.</span></div>
          <div className="brand-sub">GESTÃO DE EXPOSITORES</div>
        </div>
        <div className="headline">
          <h2>Antes de continuar, crie sua senha definitiva.</h2>
          <p>Por segurança, a senha temporária só pode ser usada uma vez. Escolha uma nova senha para acessar o sistema daqui em diante.</p>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <h1>Criar nova senha</h1>
          <p className="sub">Isso substitui a senha temporária que você recebeu.</p>
          {error && <div className="login-error show">{error}</div>}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">Nova senha</label>
              <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirmar nova senha</label>
              <input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Salvando...' : 'Salvar e continuar'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
