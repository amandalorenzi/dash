'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { createCategoryAction, deleteCategoryAction } from '@/modules/categories/actions';
import type { Category, CategoryKind } from '@/modules/categories/queries';

export function CategoriasClient({ eventId, supplierCategories, itemCategories }: {
  eventId: string; supplierCategories: Category[]; itemCategories: Category[];
}) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [removing, setRemoving] = useState<Category | null>(null);

  async function handleAdd(e: FormEvent<HTMLFormElement>, kind: CategoryKind) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const result = await createCategoryAction(eventId, String(fd.get('name') || ''), kind);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Categoria criada.', 'success');
    form.reset();
    router.refresh();
  }

  async function handleRemove() {
    if (!removing) return;
    const result = await deleteCategoryAction(removing.id);
    setRemoving(null);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Categoria removida.', 'success');
    router.refresh();
  }

  return (
    <>
      <ToastHost />
      <div className="page-header">
        <div>
          <h1>Categorias</h1>
          <p>Categorias usadas no cadastro de expositores e no catálogo de itens deste evento.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', alignItems: 'start' }}>
        <CategoryPanel
          title="Categorias de expositor"
          hint="Usadas para classificar os expositores (patrocinador, apoio, etc.)."
          categories={supplierCategories}
          onSubmit={(e) => handleAdd(e, 'SUPPLIER')}
          onRemove={setRemoving}
        />
        <CategoryPanel
          title="Categorias de item"
          hint="Usadas no catálogo de extras (mobiliário, elétrica, staff, etc.)."
          categories={itemCategories}
          onSubmit={(e) => handleAdd(e, 'ITEM')}
          onRemove={setRemoving}
        />
      </div>

      <ConfirmModal
        open={Boolean(removing)}
        title="Remover categoria"
        message={`"${removing?.name}" será removida. Registros que já usam essa categoria mantêm o texto atual, mas ela deixa de aparecer nas listas de seleção.`}
        confirmLabel="Remover" danger
        onCancel={() => setRemoving(null)}
        onConfirm={handleRemove}
      />
    </>
  );
}

function CategoryPanel({ title, hint, categories, onSubmit, onRemove }: {
  title: string; hint: string; categories: Category[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void; onRemove: (c: Category) => void;
}) {
  return (
    <div className="card">
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-body flex-col gap-16">
        <p className="text-secondary text-sm" style={{ margin: 0 }}>{hint}</p>
        {categories.length === 0 ? (
          <EmptyState icon="🏷" title="Nenhuma categoria" text="Adicione a primeira abaixo." />
        ) : (
          <ul className="checklist">
            {categories.map((c) => (
              <li key={c.id} className="ok" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{c.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => onRemove(c)}>Remover</button>
              </li>
            ))}
          </ul>
        )}
        <form className="flex gap-8" onSubmit={onSubmit}>
          <input name="name" placeholder="Nova categoria" required style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" type="submit">Adicionar</button>
        </form>
      </div>
    </div>
  );
}
