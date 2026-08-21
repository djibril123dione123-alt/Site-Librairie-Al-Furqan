'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, Edit2, BookOpen, X, Check, Loader2 } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<AdminPublisher | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
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
    if (!name.trim()) {
      setError('Le nom de l\'éditeur est obligatoire.');
      return;
    }
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

      <div className="admin-table-wrap">
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 0 }}>
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
                </td>
              </tr>
            ) : (
              filtered.map((pub) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="admin-drawer-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="admin-card" style={{ maxWidth: 480, width: '100%', margin: 'auto', backgroundColor: '#FFF', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {editingPublisher ? 'Modifier l\'éditeur' : 'Créer un éditeur'}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

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
                  autoFocus
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
          </div>
        </div>
      )}
    </>
  );
}
