'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { Availability } from '@/lib/types/ui';
import { isSupabaseConfigured } from '@/lib/supabase/server';

const AVAILABILITY_OPTIONS: { label: string; value: Availability }[] = [
  { label: 'Disponible', value: 'Disponible' },
  { label: 'Derniers exemplaires', value: 'Derniers exemplaires' },
  { label: 'De retour en stock', value: 'De retour en stock' },
  { label: 'Indisponible', value: 'Indisponible temporairement' },
];

export function QuickStockEditor({
  productId,
  currentAvailability,
}: {
  productId: string;
  currentAvailability: Availability;
}) {
  const [availability, setAvailability] = useState(currentAvailability);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = async (newValue: Availability) => {
    if (newValue === availability) return;
    setAvailability(newValue);
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch(`/api/admin/products/${productId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: newValue }),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // Erreur silencieuse pour l'instant
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-stock">
      <select
        value={availability}
        onChange={(e) => handleChange(e.target.value as Availability)}
        disabled={saving}
      >
        {AVAILABILITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {saving && <Loader2 size={13} style={{ color: 'var(--admin-text-muted)', animation: 'spin 1s linear infinite' }} />}
      {saved && <Check size={13} style={{ color: 'var(--admin-success-text)' }} />}
    </div>
  );
}
