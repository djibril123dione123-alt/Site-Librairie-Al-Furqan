import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panier',
  alternates: { canonical: '/panier' },
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
