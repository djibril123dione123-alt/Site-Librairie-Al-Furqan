'use client';

import { useState } from 'react';
import { Download, Upload, Check, Loader2, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminModal } from './admin-modal';

export function CsvImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const downloadTemplate = () => {
    const csvContent =
      'title,subtitle,author,publisher,category,price,compare_at_price,stock_quantity,description,language,isbn,pages,dimensions,binding,edition,year\n' +
      'Le Jardin des Vertueux,Texte arabe et français,Imam An-Nawawi,Éditions Al-Hadith,Spiritualité,12500,14000,10,Recueil de hadiths,Français / Arabe,978-2-93039-502-9,768,17x24 cm,Relié,2021,2021\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele-catalogue-al-furqan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setMessage('');
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setError('Le fichier CSV est vide ou ne contient que les en-têtes.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const rows = lines.slice(1).map((line) => {
          const vals = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = vals[idx] || '';
          });
          return rowObj;
        });

        setParsedRows(rows.filter((r) => r.title));
      } catch {
        setError('Erreur lors de la lecture du fichier CSV.');
      }
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const executeImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setError('');
    setMessage('');

    let successCount = 0;
    try {
      for (const row of parsedRows) {
        const payload = {
          title: row.title,
          subtitle: row.subtitle || null,
          author: row.author || null,
          publisher: row.publisher || null,
          category: row.category || null,
          price: row.price ? Number(row.price) : null,
          compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
          stockQuantity: row.stock_quantity ? Number(row.stock_quantity) : null,
          description: row.description || null,
          language: row.language || 'Français',
          isbn: row.isbn || null,
          pages: row.pages ? Number(row.pages) : null,
          dimensions: row.dimensions || null,
          binding: row.binding || null,
          edition: row.edition || null,
          year: row.year ? Number(row.year) : null,
          status: 'draft', // STRICTEMENT BROUILLON
        };

        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        }
      }

      setMessage(`${successCount} ouvrage(s) importé(s) avec succès en BROUILLON.`);
      setParsedRows([]);
      setFile(null);
      router.refresh();
    } catch {
      setError('Erreur lors de l\'importation en base de données.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminModal open={isOpen} onClose={onClose} title="Importation CSV du Catalogue (Brouillons)" maxWidth={650}>
      <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginBottom: 20 }}>
        Téléchargez le modèle CSV, remplissez vos fiches livres puis téléversez le fichier. Tous les livres seront créés en <strong>Brouillon (Draft)</strong>.
      </p>

      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {message && <div className="admin-alert admin-alert-success" style={{ marginBottom: 16 }}>{message}</div>}

      <div className="csv-modal-actions" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
          <Download size={14} /> Télécharger le modèle CSV
        </button>

        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
          <Upload size={14} /> Téléverser un fichier CSV
          <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      </div>

      {parsedRows.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--admin-border)', paddingTop: 16 }}>
          <h4 style={{ fontSize: 14, margin: '0 0 12px', fontWeight: 600 }}>
            Aperçu des fiches détectées ({parsedRows.length} livres)
          </h4>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--admin-border)', borderRadius: 6, padding: 8, fontSize: 12 }}>
            {parsedRows.map((r, i) => (
              <div key={i} style={{ padding: '4px 0', borderBottom: i < parsedRows.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                <strong>{r.title}</strong> — {r.author || 'Auteur non renseigné'} ({r.category || 'Catégorie non renseignée'})
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={importing}>
              Annuler
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={executeImport} disabled={importing}>
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Importer les {parsedRows.length} brouillons</span>
            </button>
          </div>
        </div>
      )}
    </AdminModal>
  );
}
