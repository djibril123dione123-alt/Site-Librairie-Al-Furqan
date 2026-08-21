'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, Edit2, Trash2, BookOpen, X, Check, Loader2 } from 'lucide-react';

export type AdminAuthor = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  bookCount: number;
  createdAt: string;
};

export function AuthorsManager({ initialAuthors }: { initialAuthors: AdminAuthor[] }) {
  const [authors, setAuthors] = useState<AdminAuthor[]>(initialAuthors);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AdminAuthor | null>(null);
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const filtered = authors.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.bio.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingAuthor(null);
    setName('');
    setBio('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (author: AdminAuthor) => {
    setEditingAuthor(author);
    setName(author.name);
    setBio(author.bio);
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom de l\'auteur est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const url = editingAuthor ? `/api/admin/authors/${editingAuthor.id}` : '/api/admin/authors';
      const method = editingAuthor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() }),
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
            placeholder="Rechercher un auteur par nom ou bio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          <span>Créer un auteur</span>
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Auteur / Érudit</th>
              <th>Bio</th>
              <th>Livres associés</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 0 }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Users size={24} />
                    </div>
                    <h3 className="empty-state-title">Aucun auteur trouvé</h3>
                    <p className="empty-state-text">
                      {authors.length === 0 
                        ? 'Aucun auteur n\'est actuellement enregistré.' 
                        : 'Aucun auteur ne correspond à votre recherche.'}
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                      <Plus size={14} /> Créer le premier auteur
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((author) => (
                <tr key={author.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div>{author.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--admin-text-subtle)', fontWeight: 400 }}>/{author.slug}</div>
                  </td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: 12, maxWidth: 360 }}>
                    {author.bio ? author.bio : '—'}
                  </td>
                  <td>
                    <span className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                      <BookOpen size={12} /> {author.bookCount} livre(s)
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditModal(author)}
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
                {editingAuthor ? 'Modifier l\'auteur' : 'Créer un nouvel auteur'}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Nom complet de l&apos;auteur *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Cheikh Ibn 'Uthaymin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Biographie / Notice biographique</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Grand savant sunnite contemporain né à Unayzah en Arabie Saoudite..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                  <span>{editingAuthor ? 'Mettre à jour' : 'Créer l\'auteur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
