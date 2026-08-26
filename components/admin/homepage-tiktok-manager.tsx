'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { isValidTikTokUrl } from '@/lib/social/tiktok';

type Slot = {
  position: number;
  id?: string;
  videoUrl: string;
  productId: string;
  isActive: boolean;
};

function emptySlot(position: number): Slot {
  return { position, videoUrl: '', productId: '', isActive: true };
}

function applyRows(rows: any[]): Slot[] {
  const byPosition = new Map(rows.map((r) => [r.position, r]));
  return [1, 2, 3].map((pos) => {
    const row = byPosition.get(pos);
    return row
      ? { position: pos, id: row.id, videoUrl: row.videoUrl, productId: row.productId || '', isActive: row.isActive }
      : emptySlot(pos);
  });
}

/**
 * Three fixed homepage slots — a librarian picks the URL (and optionally a
 * product) directly, no reorderable list, no add/remove-arbitrary-rows
 * complexity. Up/down swaps the immediate neighbor via the /move route.
 */
export function HomepageTikTokManager({ products }: { products: { id: string; title: string }[] }) {
  const [slots, setSlots] = useState<Slot[]>([1, 2, 3].map(emptySlot));
  const [loading, setLoading] = useState(true);
  const [busyPosition, setBusyPosition] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/admin/homepage-tiktok-videos')
      .then((r) => r.json())
      .then((rows) => setSlots(applyRows(Array.isArray(rows) ? rows : [])))
      .catch(() => setError('Erreur lors du chargement des vidéos.'))
      .finally(() => setLoading(false));
  }, []);

  function updateSlot(position: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((s) => (s.position === position ? { ...s, ...patch } : s)));
  }

  async function refreshFromServer() {
    const res = await fetch('/api/admin/homepage-tiktok-videos');
    const rows = await res.json();
    setSlots(applyRows(Array.isArray(rows) ? rows : []));
  }

  async function handleSave(position: number) {
    const slot = slots.find((s) => s.position === position);
    if (!slot || !slot.videoUrl.trim()) return;
    if (!isValidTikTokUrl(slot.videoUrl)) {
      setError('Entrez un lien de vidéo TikTok valide.');
      return;
    }
    setError('');
    setSuccess('');
    setBusyPosition(position);
    try {
      const res = await fetch(`/api/admin/homepage-tiktok-videos/${position}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: slot.videoUrl, productId: slot.productId || null, isActive: slot.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'enregistrement.");
        return;
      }
      updateSlot(position, { id: data.id, videoUrl: data.videoUrl, productId: data.productId || '', isActive: data.isActive });
      setSuccess(`Vidéo ${position} enregistrée.`);
    } catch {
      setError('Erreur réseau lors de l\'enregistrement.');
    } finally {
      setBusyPosition(null);
    }
  }

  async function handleRemove(position: number) {
    if (!confirm(`Retirer la vidéo ${position} de la page d'accueil ?`)) return;
    setError('');
    setSuccess('');
    setBusyPosition(position);
    try {
      const res = await fetch(`/api/admin/homepage-tiktok-videos/${position}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Erreur lors de la suppression.');
        return;
      }
      updateSlot(position, emptySlot(position));
      setSuccess(`Vidéo ${position} retirée.`);
    } catch {
      setError('Erreur réseau.');
    } finally {
      setBusyPosition(null);
    }
  }

  async function handleToggleActive(slot: Slot) {
    if (!slot.id) return;
    const nextActive = !slot.isActive;
    updateSlot(slot.position, { isActive: nextActive });
    setBusyPosition(slot.position);
    try {
      const res = await fetch(`/api/admin/homepage-tiktok-videos/${slot.position}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: slot.videoUrl, productId: slot.productId || null, isActive: nextActive }),
      });
      if (!res.ok) updateSlot(slot.position, { isActive: slot.isActive });
    } catch {
      updateSlot(slot.position, { isActive: slot.isActive });
    } finally {
      setBusyPosition(null);
    }
  }

  async function handleMove(position: number, direction: 'up' | 'down') {
    setError('');
    setBusyPosition(position);
    try {
      const res = await fetch(`/api/admin/homepage-tiktok-videos/${position}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors du réordonnancement.');
        return;
      }
      await refreshFromServer();
    } catch {
      setError('Erreur réseau.');
    } finally {
      setBusyPosition(null);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div>
      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="admin-alert admin-alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {slots.map((slot, idx) => (
        <div key={slot.position} className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title">Vidéo {slot.position}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={idx === 0 || busyPosition !== null}
                onClick={() => handleMove(slot.position, 'up')}
                aria-label={`Monter la vidéo ${slot.position}`}
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={idx === slots.length - 1 || busyPosition !== null}
                onClick={() => handleMove(slot.position, 'down')}
                aria-label={`Descendre la vidéo ${slot.position}`}
              >
                <ArrowDown size={13} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor={`tiktok-url-${slot.position}`}>Lien TikTok</label>
            <input
              id={`tiktok-url-${slot.position}`}
              type="text"
              className="form-input"
              placeholder="https://www.tiktok.com/@alfurqan.librairie/video/1234567890123456789"
              value={slot.videoUrl}
              onChange={(e) => updateSlot(slot.position, { videoUrl: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor={`tiktok-product-${slot.position}`}>
              Livre associé <span className="form-label-optional">facultatif</span>
            </label>
            <select
              id={`tiktok-product-${slot.position}`}
              className="form-select"
              value={slot.productId}
              onChange={(e) => updateSlot(slot.position, { productId: e.target.value })}
            >
              <option value="">— Aucun (contenu librairie général) —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {slot.id && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={slot.isActive}
                onChange={() => handleToggleActive(slot)}
                disabled={busyPosition !== null}
              />
              <span>Afficher sur la page d&apos;accueil</span>
            </label>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleSave(slot.position)}
              disabled={busyPosition !== null || !slot.videoUrl.trim()}
            >
              {busyPosition === slot.position ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Save size={14} />
              )}
              <span>Enregistrer</span>
            </button>
            {slot.id && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => handleRemove(slot.position)}
                disabled={busyPosition !== null}
              >
                <Trash2 size={14} />
                <span>Retirer</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
