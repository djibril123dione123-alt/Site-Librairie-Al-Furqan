import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Livraison',
  alternates: { canonical: '/livraison' },
  robots: { index: false, follow: true },
};

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
