'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Edit2, Eye, Library, Trash2 } from 'lucide-react';

export type AdminCollection = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string | null;
  status: 'draft' | 'published';
  productCount: number;
  position: number;
};

function StatusBadge({ status }: { status: AdminCollection['status'] }) {
  return (
    <span className={`status-badge ${status === 'published' ? 'status-published' : 'status-draft'}`}>
      {status === 'published' ? 'Publiée' : 'Brouillon'}
    </span>
  );
}

export function CollectionList({ collections }: { collections: AdminCollection[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function togglePublish(c: AdminCollection) {
    const nextStatus = c.status === 'published' ? 'draft' : 'published';
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/collections/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        alert(result.error || 'Erreur lors de la mise à jour du statut.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(c: AdminCollection) {
    if (!confirm(
      `Supprimer la collection "${c.title}" ?\n\nCela retire uniquement la sélection éditoriale — aucun livre du catalogue ne sera supprimé.`
    )) {
      return;
    }
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/collections/${c.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        const result = await res.json();
        alert(result.error || 'Erreur lors de la suppression.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setBusyId(null);
    }
  }

  async function move(c: AdminCollection, direction: 'up' | 'down') {
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/collections/${c.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Erreur lors du réordonnancement.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setBusyId(null);
    }
  }

  if (collections.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Library size={24} />
        </div>
        <h3 className="empty-state-title">Aucune collection pour le moment</h3>
        <p className="empty-state-text">Les collections permettent d&apos;effectuer des sélections thématiques sur la boutique (ex: &quot;Pack Spécial Ramadan&quot;).</p>
        <Link href="/admin/collections/nouveau" className="btn btn-primary">
          + Nouvelle collection
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="admin-table-wrap generic-desktop-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre de la collection</th>
              <th>Sur-titre (Eyebrow)</th>
              <th>Slug</th>
              <th>Livres associés</th>
              <th>Ordre</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c, i) => (
              <tr key={c.id}>
                <td><strong>{c.title}</strong></td>
                <td style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>{c.eyebrow || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--admin-text-subtle)' }}>/{c.slug}</td>
                <td><strong>{c.productCount}</strong> livre(s)</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => move(c, 'up')}
                      disabled={busyId === c.id || i === 0}
                      aria-label={`Monter ${c.title}`}
                      title="Monter"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => move(c, 'down')}
                      disabled={busyId === c.id || i === collections.length - 1}
                      aria-label={`Descendre ${c.title}`}
                      title="Descendre"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>
                </td>
                <td><StatusBadge status={c.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/admin/collections/${c.id}`} className="btn btn-secondary btn-sm" aria-label={`Modifier ${c.title}`}>
                      <Edit2 size={13} />
                    </Link>
                    {c.status === 'published' && (
                      <Link href={`/collections/${c.slug}`} target="_blank" className="btn btn-secondary btn-sm" aria-label={`Voir ${c.title} sur le site`}>
                        <Eye size={13} />
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => togglePublish(c)}
                      disabled={busyId === c.id}
                    >
                      {c.status === 'published' ? 'Dépublier' : 'Publier'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(c)}
                      disabled={busyId === c.id}
                      aria-label={`Supprimer ${c.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-list generic-mobile-list">
        {collections.map((c, i) => (
          <div key={c.id} className="admin-mobile-card">
            <div className="admin-mobile-card-row">
              <div>
                <strong>{c.title}</strong>
                <div style={{ fontSize: 11, color: 'var(--admin-text-subtle)' }}>/{c.slug}</div>
              </div>
              <StatusBadge status={c.status} />
            </div>
            {c.eyebrow && <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{c.eyebrow}</div>}
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}><strong>{c.productCount}</strong> livre(s) associé(s)</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Link href={`/admin/collections/${c.id}`} className="btn btn-secondary btn-sm">
                <Edit2 size={13} />
                <span>Modifier</span>
              </Link>
              {c.status === 'published' && (
                <Link href={`/collections/${c.slug}`} target="_blank" className="btn btn-secondary btn-sm">
                  <Eye size={13} />
                  <span>Voir</span>
                </Link>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => togglePublish(c)} disabled={busyId === c.id}>
                {c.status === 'published' ? 'Dépublier' : 'Publier'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => move(c, 'up')}
                disabled={busyId === c.id || i === 0}
                aria-label={`Monter ${c.title}`}
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => move(c, 'down')}
                disabled={busyId === c.id || i === collections.length - 1}
                aria-label={`Descendre ${c.title}`}
              >
                <ChevronDown size={13} />
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(c)} disabled={busyId === c.id}>
                <Trash2 size={13} />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
