'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import '@/styles/dash-ui.css';

export default function SetupPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setAvailable(Boolean(d.available)))
      .catch(() => setAvailable(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Não foi possível concluir a configuração.'); return; }
    setResult({ email: data.email, tempPassword: data.tempPassword });
  }

  return (
    <div className="login-shell">
      <div className="login-brand">
        <div>
          <div className="brand-mark">dash<span className="dot">.</span></div>
          <div className="brand-sub">GESTÃO DE EXPOSITORES</div>
        </div>
        <div className="headline">
          <h2>Configuração inicial</h2>
          <p>Crie o primeiro administrador direto por aqui. Não é preciso rodar nenhum script nem instalar nada na sua máquina.</p>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          {available === null && <p className="sub">Verificando...</p>}

          {available === false && !result && (
            <>
              <h1>Configuração já concluída</h1>
              <p className="sub">Já existe pelo menos um usuário cadastrado. Por segurança, esta tela fica desativada a partir daí.</p>
              <Link href="/login" className="btn btn-primary btn-block">Ir para o login</Link>
            </>
          )}

          {available === true && !result && (
            <>
              <h1>Criar administrador</h1>
              <p className="sub">Este será o primeiro usuário com acesso total ao sistema.</p>
              {error && <div className="login-error show">{error}</div>}
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="name">Nome</label>
                  <input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="field">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@dasheventos.com.br" />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar administrador'}
                </button>
              </form>
            </>
          )}

          {result && (
            <>
              <h1>Administrador criado</h1>
              <p className="sub">Copie a senha agora — ela não será mostrada novamente. Você terá que trocá-la no primeiro acesso.</p>
              <div className="field mb-16">
                <label>E-mail</label>
                <input readOnly value={result.email} onFocus={(e) => e.target.select()} />
              </div>
              <div className="field mb-16">
                <label>Senha temporária</label>
                <input readOnly value={result.tempPassword} onFocus={(e) => e.target.select()} />
              </div>
              <Link href="/login" className="btn btn-primary btn-block">Ir para o login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
