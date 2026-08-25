'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, Edit2, BookOpen, Check, Loader2 } from 'lucide-react';
import { AdminModal } from './admin-modal';

export type AdminPublisher = {
  id: string;
  name: string;
  slug: string;
  description: string;
  bookCount: number;
  createdAt: string;
};

export function PublishersManager({ initialPublishers }: { initialPublishers: AdminPublisher[] }) {
  const [publishers, setPublishers] = useState<AdminPublisher[]>(initialPublishers);
  // Same reasoning as AuthorsManager: useState(initialPublishers) only
  // seeds on mount, so without this effect a create/edit's router.refresh()
  // would never actually reach this component's rendered list.
  useEffect(() => {
    setPublishers(initialPublishers);
  }, [initialPublishers]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<AdminPublisher | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const filtered = publishers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingPublisher(null);
    setName('');
    setDescription('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (pub: AdminPublisher) => {
    setEditingPublisher(pub);
    setName(pub.name);
    setDescription(pub.description);
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setError('');

    try {
      const url = editingPublisher ? `/api/admin/publishers/${editingPublisher.id}` : '/api/admin/publishers';
      const method = editingPublisher ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde.');
        return;
      }

      setShowModal(false);
      router.refresh();
    } catch {
      setError('Erreur réseau lors de l\'enregistrement.');
    } finally {
      isSubmittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={15} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Rechercher un éditeur par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          <span>Créer un éditeur</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Building2 size={24} />
          </div>
          <h3 className="empty-state-title">Aucun éditeur trouvé</h3>
          <p className="empty-state-text">
            {publishers.length === 0
              ? 'Aucune maison d\'édition n\'est actuellement enregistrée.'
              : 'Aucun éditeur ne correspond à votre recherche.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={14} /> Ajouter un éditeur
          </button>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap generic-desktop-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Maison d&apos;édition</th>
                  <th>Description</th>
                  <th>Livres au catalogue</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pub) => (
                  <tr key={pub.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div>{pub.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-subtle)', fontWeight: 400 }}>/{pub.slug}</div>
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: 12, maxWidth: 360 }}>
                      {pub.description ? pub.description : '—'}
                    </td>
                    <td>
                      <span className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                        <BookOpen size={12} /> {pub.bookCount} livre(s)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(pub)}
                      >
                        <Edit2 size={13} /> Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-mobile-list generic-mobile-list">
            {filtered.map((pub) => (
              <div key={pub.id} className="admin-mobile-card">
                <div>
                  <strong>{pub.name}</strong>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-subtle)' }}>/{pub.slug}</div>
                </div>
                {pub.description && (
                  <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', margin: 0 }}>
                    {pub.description.length > 120 ? `${pub.description.slice(0, 120)}…` : pub.description}
                  </p>
                )}
                <div className="admin-mobile-card-row">
                  <span className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                    <BookOpen size={12} /> {pub.bookCount} livre(s)
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(pub)}>
                    <Edit2 size={13} /> Modifier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AdminModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingPublisher ? "Modifier l'éditeur" : 'Créer un éditeur'}
      >
        {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nom de l&apos;éditeur *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Éditions Darussalam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-autofocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Présentation</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Maison d'édition internationale spécialisée dans les traductions islamiques de référence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              <span>{editingPublisher ? 'Mettre à jour' : 'Enregistrer l\'éditeur'}</span>
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
