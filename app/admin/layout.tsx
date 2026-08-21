import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/admin-nav';
import '@/app/admin/admin.css';

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminNav />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
