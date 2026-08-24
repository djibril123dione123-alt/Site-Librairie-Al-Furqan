import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/auth';
import { uiAvailabilityToDb } from '@/lib/types/mappers';
import { z } from 'zod';
import { revalidateProductSurfaces } from '@/lib/data/revalidate-product';

const schema = z.object({
  availability: z.enum(['Disponible', 'Derniers exemplaires', 'De retour en stock', 'Indisponible temporairement']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const dbAvailability = uiAvailabilityToDb(parsed.data.availability);
    
    // Si pas de service role key (dev), retourner succès sans persister
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: true, message: 'Mode dev - non persisté' });
    }

    const supabase = createAdminClient();
    const { data: updated, error } = await supabase
      .from('products')
      .update({
        availability: dbAvailability,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('slug')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (updated?.slug) {
      revalidateProductSurfaces(updated.slug);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
