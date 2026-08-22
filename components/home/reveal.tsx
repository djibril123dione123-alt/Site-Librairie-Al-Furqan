'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * One shared IntersectionObserver-based reveal for homepage sections —
 * opacity + translateY, no per-card stagger. Reduced-motion is handled by
 * the global catch-all rule in globals.css, not duplicated here.
 */
export function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''}`}>
      {children}
    </div>
  );
}
