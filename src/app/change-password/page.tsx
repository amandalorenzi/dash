'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import '@/styles/dash-ui.css';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Preenchido quando a sessão do navegador se perdeu e precisamos reautenticar. */
  const [reauth, setReauth] = useState<{ email: string; currentPassword: string }>({ email: '', currentPassword: '' });
  const [needsReauth, setNeedsReauth] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não conferem.'); return; }

    setLoading(true);
    try {
      const auth = getFirebaseAuthClient();
      let currentUser = auth.currentUser;

      // Se o usuário recarregou a página ou voltou depois, o Firebase do
      // navegador pode não ter mais o usuário em memória. Nesse caso pedimos
      // e-mail + senha temporária para reautenticar antes de trocar.
      if (!currentUser) {
        if (!needsReauth) {
          setNeedsReauth(true);
          setLoading(false);
          setError('Confirme seu e-mail e a senha temporária para continuar.');
          return;
        }
        const credential = await signInWithEmailAndPassword(auth, reauth.email, reauth.currentPassword);
        currentUser = credential.user;
      }

      await updatePassword(currentUser, password);

      // A troca de senha revoga a sessão anterior — pegamos um token novo e
      // pedimos ao servidor um cookie de sessão novo na mesma operação.
      const idToken = await currentUser.getIdToken(true);
      const res = await fetch('/api/auth/complete-password-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Não foi possível concluir a troca de senha.'); setLoading(false); return; }

      router.push(data.role === 'EXPOSITOR' ? '/portal' : '/admin/dashboard');
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        setNeedsReauth(true);
        setError('Por segurança, confirme seu e-mail e a senha temporária para trocar a senha.');
      } else if (code === 'auth/weak-password') {
        setError('Senha muito fraca. Use pelo menos 8 caracteres, com letras e números.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('E-mail ou senha temporária incorretos.');
      } else {
        setError('Não foi possível trocar a senha. Tente sair e entrar novamente com a senha temporária.');
      }
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
            {needsReauth && (
              <>
                <div className="field">
                  <label htmlFor="reauth-email">E-mail</label>
                  <input id="reauth-email" type="email" required value={reauth.email}
                    onChange={(e) => setReauth((r) => ({ ...r, email: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="reauth-pass">Senha temporária</label>
                  <input id="reauth-pass" type="password" required value={reauth.currentPassword}
                    onChange={(e) => setReauth((r) => ({ ...r, currentPassword: e.target.value }))} />
                </div>
              </>
            )}
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
