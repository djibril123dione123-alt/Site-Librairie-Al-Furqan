import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';
import { Users, Plus, BookOpen, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { AuthorsManager } from '@/components/admin/authors-manager';

async function getAuthorsData() {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('authors')
    .select('id, name, slug, bio, created_at, products(count)')
    .order('name');

  if (error || !data) return [];

  return data.map((a: any) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    bio: a.bio || '',
    bookCount: a.products?.[0]?.count ?? 0,
    createdAt: a.created_at
  }));
}

export default async function AdminAuteursPage() {
  const authors = await getAuthorsData();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Auteurs & Érudits</h1>
          <p className="admin-page-subtitle">Gérez la liste des auteurs, traducteurs et commentateurs d&apos;ouvrages.</p>
        </div>
      </div>

      <AuthorsManager initialAuthors={authors} />
    </div>
  );
}
