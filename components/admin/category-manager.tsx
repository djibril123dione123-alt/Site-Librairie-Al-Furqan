'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronUp, ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  slug: string;
  position: number;
  isVisible: boolean;
};

export function CategoryManager({ categories: initial }: { categories: Category[] }) {
  const [categories, setCategories] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const updateCategory = async (id: string, changes: Partial<Category>) => {
    setSaving(id);
    try {
      await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...changes } : c))
      );
    } finally {
      setSaving(null);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...categories];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    newList.forEach((c, i) => {
      if (c.position !== i) updateCategory(c.id, { position: i });
    });
    setCategories(newList.map((c, i) => ({ ...c, position: i })));
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newList = [...categories];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    newList.forEach((c, i) => {
      if (c.position !== i) updateCategory(c.id, { position: i });
    });
    setCategories(newList.map((c, i) => ({ ...c, position: i })));
  };

  const toggleVisibility = (cat: Category) => {
    updateCategory(cat.id, { isVisible: !cat.isVisible });
  };

  const addCategory = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const slug = newName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug, position: categories.length }),
      });
      const result = await response.json();
      if (result.id) {
        setCategories((prev) => [
          ...prev,
          { id: result.id, name: newName.trim(), slug, position: prev.length, isVisible: true },
        ]);
        setNewName('');
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className="admin-card">
        <h2 className="admin-card-title">Catégories ({categories.length})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Slug</th>
                <th>Visible</th>
                <th>Ordre</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, index) => (
                <tr key={cat.id} style={{ opacity: cat.isVisible ? 1 : 0.5 }}>
                  <td style={{ color: '#718096' }}>{index + 1}</td>
                  <td><strong>{cat.name}</strong></td>
                  <td style={{ fontSize: 12, color: '#718096' }}>{cat.slug}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleVisibility(cat)}
                      disabled={saving === cat.id}
                      title={cat.isVisible ? 'Masquer' : 'Afficher'}
                    >
                      {saving === cat.id ? (
                        <Loader2 size={12} />
                      ) : cat.isVisible ? (
                        <Eye size={12} />
                      ) : (
                        <EyeOff size={12} />
                      )}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => moveUp(index)} disabled={index === 0}>
                        <ChevronUp size={12} />
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => moveDown(index)} disabled={index === categories.length - 1}>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Ajouter une catégorie</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="form-input"
            placeholder="Ex: Jurisprudence"
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <button className="btn btn-primary" onClick={addCategory} disabled={adding || !newName.trim()}>
            {adding ? <Loader2 size={14} /> : <Plus size={14} />}
            Ajouter
          </button>
        </div>
      </div>
    </>
  );
}
