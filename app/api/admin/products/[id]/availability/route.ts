import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uiAvailabilityToDb } from '@/lib/types/mappers';
import { z } from 'zod';

const schema = z.object({
  availability: z.enum(['Disponible', 'Derniers exemplaires', 'De retour en stock', 'Indisponible temporairement']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const { error } = await supabase
      .from('products')
      .update({
        availability: dbAvailability,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
