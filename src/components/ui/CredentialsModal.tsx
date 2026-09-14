'use client';

export interface TempCredentials { email: string; tempPassword: string }

export function CredentialsModal({ credentials, onClose }: { credentials: TempCredentials | null; onClose: () => void }) {
  if (!credentials) return null;
  return (
    <div className="overlay open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>Acesso gerado</h3>
        <p>Copie agora — a senha não será mostrada novamente. Repasse por fora do sistema (WhatsApp, telefone, etc.).</p>
        <div className="field mb-16">
          <label>E-mail</label>
          <input readOnly value={credentials.email} onFocus={(e) => e.target.select()} />
        </div>
        <div className="field mb-16">
          <label>Senha temporária</label>
          <input readOnly value={credentials.tempPassword} onFocus={(e) => e.target.select()} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Já copiei, fechar</button>
        </div>
      </div>
    </div>
  );
}
