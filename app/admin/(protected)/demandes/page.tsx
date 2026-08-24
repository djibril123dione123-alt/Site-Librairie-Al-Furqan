import Link from 'next/link';
import { Plus } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { getZeroResultSearches, getBookRequests } from '@/lib/data/search';

async function getDemandesData() {
  if (!isSupabaseConfigured()) {
    return { zeroResults: [], bookRequests: [] };
  }
  const [zeroResults, bookRequests] = await Promise.all([
    getZeroResultSearches(30),
    getBookRequests(30),
  ]);
  return { zeroResults, bookRequests };
}

export default async function DemandesPage() {
  const { zeroResults, bookRequests } = await getDemandesData();
  const isConfigured = isSupabaseConfigured();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Demandes & Recherches</h1>
          <p className="admin-page-subtitle">Analytics anonymes — aucune donnée personnelle collectée.</p>
        </div>
      </div>

      {!isConfigured && (
        <div className="admin-alert admin-alert-warning">
          Données disponibles uniquement avec Supabase configuré.
        </div>
      )}

      <div className="admin-card">
        <h2 className="admin-card-title">Recherches sans résultat ({zeroResults.length})</h2>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, marginBottom: 16 }}>
          Ces recherches n&apos;ont retourné aucun livre. Elles indiquent les ouvrages les plus demandés.
        </p>
        {zeroResults.length === 0 ? (
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Aucune recherche sans résultat enregistrée.</p>
        ) : (
          <>
            <div className="admin-table-wrap generic-desktop-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Recherche</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Occurrences</th>
                    <th style={{ width: 140 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {zeroResults.map((row) => (
                    <tr key={row.query}>
                      <td><strong>{row.query}</strong></td>
                      <td style={{ textAlign: 'right', color: row.count >= 5 ? 'var(--admin-danger-text)' : 'var(--admin-text-muted)' }}>
                        {row.count}
                      </td>
                      <td>
                        <Link
                          href={`/admin/produits/nouveau?prefill=${encodeURIComponent(row.query)}`}
                          className="btn btn-secondary btn-sm"
                        >
                          <Plus size={12} /> Ajouter ce livre
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-mobile-list generic-mobile-list">
              {zeroResults.map((row) => (
                <div key={row.query} className="admin-mobile-card">
                  <div className="admin-mobile-card-row">
                    <strong>{row.query}</strong>
                    <span style={{ color: row.count >= 5 ? 'var(--admin-danger-text)' : 'var(--admin-text-muted)', fontWeight: 600 }}>
                      {row.count}×
                    </span>
                  </div>
                  <Link
                    href={`/admin/produits/nouveau?prefill=${encodeURIComponent(row.query)}`}
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'center', minHeight: 44 }}
                  >
                    <Plus size={12} /> Ajouter ce livre
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Demandes d&apos;ouvrages ({bookRequests.length})</h2>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, marginBottom: 16 }}>
          Visiteurs ayant cliqué « Demander cet ouvrage » sur WhatsApp.
        </p>
        {bookRequests.length === 0 ? (
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Aucune demande enregistrée.</p>
        ) : (
          <>
            <div className="admin-table-wrap generic-desktop-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ouvrage demandé</th>
                    <th>Source</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Demandes</th>
                  </tr>
                </thead>
                <tbody>
                  {bookRequests.map((row) => (
                    <tr key={row.query}>
                      <td><strong>{row.query}</strong></td>
                      <td style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>{row.source}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-mobile-list generic-mobile-list">
              {bookRequests.map((row) => (
                <div key={row.query} className="admin-mobile-card">
                  <div className="admin-mobile-card-row">
                    <strong>{row.query}</strong>
                    <span style={{ fontWeight: 600 }}>{row.count}×</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{row.source}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
