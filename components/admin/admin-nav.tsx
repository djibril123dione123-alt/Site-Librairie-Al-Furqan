'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, BookMarked, Tag, Library, MessageSquare, LogOut } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/admin/produits', label: 'Produits', icon: BookMarked },
  { href: '/admin/categories', label: 'Catégories', icon: Tag },
  { href: '/admin/collections', label: 'Collections', icon: Library },
  { href: '/admin/demandes', label: 'Demandes', icon: MessageSquare },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Si Supabase non configuré, ignorer
    }
    router.push('/admin/login');
  };

  return (
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-logo">
        <BookOpen size={20} />
        <span>
          <strong>Al Furqan</strong>
          <small>Administration</small>
        </span>
      </Link>
      <nav className="admin-nav">
        <span className="admin-nav-group">Navigation</span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'active' : ''}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
        <span className="admin-nav-group" style={{ marginTop: 8 }}>Site</span>
        <Link href="/" target="_blank">
          <BookOpen size={16} />
          Voir le site
        </Link>
      </nav>
      <div className="admin-signout">
        <button onClick={handleSignOut}>
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
