'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import '@/styles/dash-ui.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuthClient();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Não foi possível entrar. Verifique suas credenciais.');
        setLoading(false);
        return;
      }

      router.push(data.role === 'EXPOSITOR' ? '/portal' : '/admin/dashboard');
      router.refresh();
    } catch {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-brand">
        <div>
          <div className="brand-mark">dash<span className="dot">.</span></div>
          <div className="brand-sub">SUPPLIER MANAGEMENT</div>
        </div>
        <div className="headline">
          <h2>Gestão de expositores em um só lugar.</h2>
          <p>Cadastros, catálogo de extras, solicitações, validações e pagamentos — organizados por evento, do jeito que a produção precisa.</p>
        </div>
        <div className="stats">
          <div><b>+1500</b><span>eventos realizados</span></div>
          <div><b>30+</b><span>mercados atendidos</span></div>
          <div><b>v1.0</b><span>Batch 1 + Batch 2</span></div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <h1>Acessar plataforma</h1>
          <p className="sub">Entre com o e-mail e senha cadastrados no Firebase Authentication.</p>

          {error && <div className="login-error show">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@empresa.com" />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="demo-box">
            <p>Primeiro acesso?</p>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              Crie o usuário administrador no Firebase Authentication e o respectivo perfil na coleção
              <code> profiles</code> seguindo o guia <code>docs/SETUP-PASSO-A-PASSO.md</code>. Não há login de demonstração
              embutido nesta versão — os dados são reais, vindos do seu projeto Firebase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
