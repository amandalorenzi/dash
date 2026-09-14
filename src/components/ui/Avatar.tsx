'use client';

/* eslint-disable @next/next/no-img-element */

/** Avatar com fallback de iniciais quando não há imagem (ou quando ela falha ao carregar). */
export function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  if (url) {
    return (
      <img
        src={url} alt={name} width={size} height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.removeAttribute('hidden'); }}
      />
    );
  }

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38), flexShrink: 0 }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
