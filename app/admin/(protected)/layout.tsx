import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/admin-nav';
import { requireAdmin } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import '../admin.css';

export const metadata: Metadata = {
  title: {
    default: 'Administration — Al Furqan',
    template: '%s — Admin Al Furqan',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { error } = await requireAdmin();
  if (error) {
    redirect('/admin/login');
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
